"""
Simulation Routes
Handles neural network evaluation and evolution endpoints.
"""

from fastapi import APIRouter, HTTPException
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
    GenomeSchema
)

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
async def initialize_simulation(config: SimulationConfigSchema):
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
async def evolve_population(fitness_data: BatchFitnessSchema):
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
