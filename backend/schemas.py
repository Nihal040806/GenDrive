"""
Pydantic Schemas for Data Validation
Ensures integrity of API request/response data.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime


class LayerConfig(BaseModel):
    """Configuration for neural network layers."""
    sizes: List[int] = Field(
        default=[5, 6, 4, 2],
        description="Neuron count per layer: [input, hidden..., output]"
    )
    
    @validator('sizes')
    def validate_layers(cls, v):
        if len(v) < 2:
            raise ValueError("Network must have at least input and output layers")
        if any(s <= 0 for s in v):
            raise ValueError("Layer sizes must be positive")
        return v


class GenomeSchema(BaseModel):
    """Neural network genome structure for serialization."""
    layer_sizes: List[int] = Field(..., description="Neurons per layer")
    weights: List[List[List[float]]] = Field(..., description="Weight matrices")
    biases: List[List[List[float]]] = Field(..., description="Bias vectors")
    
    class Config:
        json_schema_extra = {
            "example": {
                "layer_sizes": [5, 6, 4, 2],
                "weights": [[[0.1, 0.2], [0.3, 0.4]]],
                "biases": [[[0.01, 0.02]]]
            }
        }


class SimulationConfigSchema(BaseModel):
    """Configuration for simulation parameters."""
    population_size: int = Field(default=100, ge=10, le=500)
    layer_sizes: List[int] = Field(default=[5, 6, 4, 2])
    mutation_rate: float = Field(default=0.05, ge=0.0, le=1.0)
    mutation_strength: float = Field(default=0.3, ge=0.0, le=1.0)
    crossover_rate: float = Field(default=0.7, ge=0.0, le=1.0)
    elitism_rate: float = Field(default=0.05, ge=0.0, le=0.5)
    tournament_size: int = Field(default=5, ge=2, le=20)


class SensorInputSchema(BaseModel):
    """Sensor readings from a single agent."""
    agent_id: int = Field(..., ge=0)
    sensors: List[float] = Field(..., min_length=1, max_length=20)
    
    @validator('sensors')
    def validate_sensors(cls, v):
        # Normalize sensor values to 0-1 range
        return [max(0.0, min(1.0, s)) for s in v]


class BatchSensorInputSchema(BaseModel):
    """Batch sensor readings from all agents."""
    inputs: List[SensorInputSchema]


class MotorOutputSchema(BaseModel):
    """Motor commands for a single agent."""
    agent_id: int
    steering: float = Field(..., ge=-1.0, le=1.0)
    acceleration: float = Field(..., ge=0.0, le=1.0)


class BatchMotorOutputSchema(BaseModel):
    """Batch motor commands for all agents."""
    outputs: List[MotorOutputSchema]


class FitnessScoreSchema(BaseModel):
    """Fitness score for a single agent."""
    agent_id: int = Field(..., ge=0)
    fitness: float = Field(..., description="Fitness score (higher is better)")
    distance_traveled: Optional[float] = None
    time_alive: Optional[float] = None
    checkpoints_passed: Optional[int] = None


class BatchFitnessSchema(BaseModel):
    """Batch fitness scores for evolution."""
    scores: List[FitnessScoreSchema]
    trigger_evolution: bool = Field(default=True)


class GenerationStatsSchema(BaseModel):
    """Statistics for a single generation."""
    generation: int
    best_fitness: float
    average_fitness: float
    worst_fitness: float
    mutation_rate: float
    population_size: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EvolutionResultSchema(BaseModel):
    """Result of evolution step."""
    generation: int
    best_fitness: float
    average_fitness: float
    improvement: float
    mutation_rate: float
    genomes: Optional[List[GenomeSchema]] = None


class SaveGenomeRequest(BaseModel):
    """Request to save a genome."""
    name: str = Field(..., min_length=1, max_length=100)
    genome: GenomeSchema
    fitness: float
    generation: int
    description: Optional[str] = None


class LoadGenomeResponse(BaseModel):
    """Response with loaded genome."""
    id: int
    name: str
    genome: GenomeSchema
    fitness: float
    generation: int
    description: Optional[str]
    created_at: datetime


class AnalyticsResponseSchema(BaseModel):
    """Analytics data response."""
    total_generations: int
    best_fitness_ever: float
    average_improvement_rate: float
    fitness_history: List[float]
    generation_times: List[float]


class LoadPopulationRequest(BaseModel):
    """Request to load a genome into the population."""
    genome: GenomeSchema
    test_mode: bool = Field(default=False, description="If true, disable mutation for testing")
    generation: int = Field(default=0)
