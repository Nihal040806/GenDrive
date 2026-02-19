"""
Simulation Routes
Handles neural network evaluation and evolution endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import numpy as np
import time
import uuid

from core import NeuralNetwork, Population, GeneticAlgorithm
from schemas import (
    SimulationConfigSchema,
    BatchSensorInputSchema,
    BatchMotorOutputSchema,
    MotorOutputSchema,
    BatchFitnessSchema,
    EvolutionResultSchema,
    GenomeSchema,
    LoadPopulationRequest
)
from database import get_db, SimulationSession, GenerationLog

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

# Global state for current simulation
class SimulationState:
    def __init__(self):
        self.session_id: Optional[str] = None
        self.population: Optional[Population] = None
        self.ga: Optional[GeneticAlgorithm] = None
        self.config: Optional[SimulationConfigSchema] = None
        self.is_initialized: bool = False

state = SimulationState()


@router.post("/initialize", response_model=dict)
async def initialize_simulation(config: SimulationConfigSchema, db: Session = Depends(get_db)):
    """
    Initialize a new simulation with given configuration.
    Creates population of neural networks and genetic algorithm.
    """
    state.session_id = str(uuid.uuid4())[:8]
    state.config = config
    
    # Create population
    state.population = Population(
        population_size=config.population_size,
        layer_sizes=config.layer_sizes
    )
    
    # Create genetic algorithm
    state.ga = GeneticAlgorithm(
        population_size=config.population_size,
        elitism_rate=config.elitism_rate,
        mutation_rate=config.mutation_rate,
        mutation_strength=config.mutation_strength,
        crossover_rate=config.crossover_rate,
        tournament_size=config.tournament_size
    )
    
    state.is_initialized = True
    
    # Store session in database
    db_session = SimulationSession(
        session_id=state.session_id,
        config=config.model_dump()
    )
    db.add(db_session)
    try:
        db.commit()
    except Exception as e:
        print(f"Error saving session: {e}")
        db.rollback()
    
    # Return initial genomes for frontend
    genomes = state.population.get_all_genomes()
    
    return {
        "session_id": state.session_id,
        "population_size": config.population_size,
        "layer_sizes": config.layer_sizes,
        "message": "Simulation initialized successfully",
        "genomes": genomes
    }


@router.post("/evaluate", response_model=BatchMotorOutputSchema)
async def evaluate_sensors(inputs: BatchSensorInputSchema):
    """
    Evaluate sensor inputs through neural networks.
    Returns motor outputs (steering, acceleration) for each agent.
    """
    if not state.is_initialized:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    outputs = []
    
    for sensor_input in inputs.inputs:
        agent_id = sensor_input.agent_id
        
        if agent_id >= len(state.population.networks):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid agent_id: {agent_id}"
            )
        
        # Get neural network output
        nn = state.population.networks[agent_id]
        sensor_array = np.array(sensor_input.sensors)
        result = nn.forward(sensor_array).flatten()
        
        outputs.append(MotorOutputSchema(
            agent_id=agent_id,
            steering=float(result[0]),
            acceleration=float(result[1]) if len(result) > 1 else 0.5
        ))
    
    return BatchMotorOutputSchema(outputs=outputs)


@router.post("/evolve", response_model=EvolutionResultSchema)
async def evolve_population(fitness_data: BatchFitnessSchema, db: Session = Depends(get_db)):
    """
    Trigger evolution step with fitness scores.
    Returns new generation statistics and optionally new genomes.
    """
    if not state.is_initialized:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    start_time = time.time()
    
    # Set fitness scores
    fitness_scores = [0.0] * len(state.population.networks)
    for score in fitness_data.scores:
        if score.agent_id < len(fitness_scores):
            fitness_scores[score.agent_id] = score.fitness
    
    state.population.set_fitness(fitness_scores)
    
    # Evolve to next generation
    if fitness_data.trigger_evolution:
        state.population = state.ga.evolve(state.population)
        
        # Adaptive mutation
        state.ga.adaptive_mutation()
    
    evolution_time = (time.time() - start_time) * 1000  # ms
    
    stats = state.ga.get_statistics()
    
    # Log generation to database
    if fitness_data.trigger_evolution:
        gen_log = GenerationLog(
            session_id=state.session_id,
            generation=stats['generation'],
            best_fitness=stats['current_best_fitness'],
            average_fitness=stats['current_avg_fitness'],
            worst_fitness=stats['current_best_fitness'] - stats['improvement'], # Approximation
            mutation_rate=state.ga.mutation_rate,
            population_size=len(state.population.networks),
            evolution_time_ms=evolution_time
        )
        db.add(gen_log)
        
        # Update session stats
        db_session = db.query(SimulationSession).filter(SimulationSession.session_id == state.session_id).first()
        if db_session:
            db_session.total_generations = stats['generation']
            if stats['current_best_fitness'] > db_session.best_fitness_achieved:
                db_session.best_fitness_achieved = stats['current_best_fitness']
        
        try:
            db.commit()
        except Exception as e:
            print(f"Error saving generation log: {e}")
            db.rollback()

    return EvolutionResultSchema(
        generation=stats['generation'],
        best_fitness=stats['current_best_fitness'],
        average_fitness=stats['current_avg_fitness'],
        improvement=stats['improvement'],
        mutation_rate=state.ga.mutation_rate,
        genomes=[GenomeSchema(**g) for g in state.population.get_all_genomes()]
    )


@router.get("/status")
async def get_simulation_status():
    """Get current simulation status and statistics."""
    if not state.is_initialized:
        return {"initialized": False}
    
    stats = state.ga.get_statistics()
    
    return {
        "initialized": True,
        "session_id": state.session_id,
        "generation": stats['generation'],
        "population_size": len(state.population.networks),
        "current_best_fitness": stats['current_best_fitness'],
        "current_avg_fitness": stats['current_avg_fitness'],
        "mutation_rate": state.ga.mutation_rate,
        "improvement": stats['improvement']
    }


@router.post("/reset")
async def reset_simulation():
    """Reset simulation to initial state."""
    if state.config:
        # Re-initialize with same config
        return await initialize_simulation(state.config)
    
    state.is_initialized = False
    state.population = None
    state.ga = None
    
    return {"message": "Simulation reset"}


@router.get("/best-genome", response_model=GenomeSchema)
async def get_best_genome():
    """Get the current best performing genome."""
    if not state.is_initialized:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    best = state.population.get_best(1)
    if not best:
        raise HTTPException(status_code=404, detail="No genomes available")
    
    return GenomeSchema(**best[0][0].get_genome())


@router.post("/load-population", response_model=dict)
async def load_population(request: LoadPopulationRequest):
    """
    Load a specific genome into the population.
    Replaces all agents with this genome (or variations).
    """
    # Initialize if not already
    if not state.is_initialized:
        # Use default config if none exists, but adapt input size to genome
        output_size = request.genome.layer_sizes[-1]
        input_size = request.genome.layer_sizes[0]
        
        default_config = SimulationConfigSchema(
            population_size=100, # Default
            layer_sizes=request.genome.layer_sizes
        )
        
        # Initialize
        state.session_id = str(uuid.uuid4())[:8]
        state.config = default_config
        state.population = Population(
            population_size=default_config.population_size,
            layer_sizes=default_config.layer_sizes
        )
        state.ga = GeneticAlgorithm(
            population_size=default_config.population_size,
            elitism_rate=default_config.elitism_rate,
            mutation_rate=default_config.mutation_rate,
            mutation_strength=default_config.mutation_strength,
            crossover_rate=default_config.crossover_rate,
            tournament_size=default_config.tournament_size
        )
        state.is_initialized = True
    
    # Check compatibility
    if state.population.layer_sizes != request.genome.layer_sizes:
        # Re-initialize with correct size if mismatch
        state.population = Population(
            population_size=state.config.population_size,
            layer_sizes=request.genome.layer_sizes
        )
        state.config.layer_sizes = request.genome.layer_sizes

    # Set all genomes to the loaded one
    # If test_mode is True, make exact copies. 
    # If False (continuing training), maybe add slight noise? 
    # For now, let's set them all to exact copies and let the next evolve step handle mutation.
    
    loaded_genome_dict = request.genome.model_dump()
    genomes_list = [loaded_genome_dict for _ in range(state.population.population_size)]
    state.population.set_all_genomes(genomes_list)
    
    # Update generation count
    if state.ga:
        state.ga.generation = request.generation
        
    print(f"DEBUG: Loaded genome into population. Gen: {request.generation}")
    
    return {
        "message": "Population loaded successfully",
        "generation": request.generation,
        "population_size": state.population.population_size
    }
