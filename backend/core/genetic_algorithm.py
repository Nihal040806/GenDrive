"""
Genetic Algorithm Module
Evolutionary optimization for neural network populations.
Implements selection, crossover, and mutation operations.
"""

import numpy as np
from typing import List, Tuple, Optional
from .neural_network import NeuralNetwork, Population


class GeneticAlgorithm:
    """
    Genetic Algorithm optimizer for neural network evolution.
    
    Implements:
    - Tournament selection
    - Crossover (single-point and uniform)
    - Gaussian mutation
    - Elitism
    """
    
    def __init__(
        self,
        population_size: int = 100,
        elitism_rate: float = 0.05,
        mutation_rate: float = 0.05,
        mutation_strength: float = 0.3,
        crossover_rate: float = 0.7,
        tournament_size: int = 5
    ):
        """
        Initialize genetic algorithm parameters.
        
        Args:
            population_size: Number of agents per generation
            elitism_rate: Fraction of top performers to preserve unchanged
            mutation_rate: Probability of mutating each weight
            mutation_strength: Standard deviation of mutation noise
            crossover_rate: Probability of crossover vs cloning
            tournament_size: Number of competitors in tournament selection
        """
        self.population_size = population_size
        self.elitism_rate = elitism_rate
        self.mutation_rate = mutation_rate
        self.mutation_strength = mutation_strength
        self.crossover_rate = crossover_rate
        self.tournament_size = tournament_size
        
        # Statistics tracking
        self.generation = 0
        self.best_fitness_history: List[float] = []
        self.avg_fitness_history: List[float] = []
    
    def tournament_selection(
        self, 
        population: Population
    ) -> NeuralNetwork:
        """
        Select a parent using tournament selection.
        
        Args:
            population: Current population
            
        Returns:
            Selected neural network (copy)
        """
        # Randomly select tournament competitors
        indices = np.random.choice(
            len(population.networks), 
            size=min(self.tournament_size, len(population.networks)),
            replace=False
        )
        
        # Find winner (highest fitness)
        best_idx = indices[0]
        best_fitness = population.fitness_scores[best_idx]
        
        for idx in indices[1:]:
            if population.fitness_scores[idx] > best_fitness:
                best_idx = idx
                best_fitness = population.fitness_scores[idx]
        
        return population.networks[best_idx].copy()
    
    def roulette_selection(
        self, 
        population: Population
    ) -> NeuralNetwork:
        """
        Select a parent using fitness-proportionate selection.
        
        Args:
            population: Current population
            
        Returns:
            Selected neural network (copy)
        """
        # Shift fitness to be positive
        min_fitness = min(population.fitness_scores)
        shifted_fitness = [f - min_fitness + 1 for f in population.fitness_scores]
        total_fitness = sum(shifted_fitness)
        
        # Calculate selection probabilities
        probabilities = [f / total_fitness for f in shifted_fitness]
        
        # Select based on probability
        idx = np.random.choice(len(population.networks), p=probabilities)
        return population.networks[idx].copy()
    
    def crossover(
        self, 
        parent1: NeuralNetwork, 
        parent2: NeuralNetwork,
        method: str = 'uniform'
    ) -> Tuple[NeuralNetwork, NeuralNetwork]:
        """
        Perform crossover between two parent networks.
        
        Args:
            parent1: First parent network
            parent2: Second parent network
            method: 'uniform' or 'single_point'
            
        Returns:
            Tuple of two child networks
        """
        child1 = parent1.copy()
        child2 = parent2.copy()
        
        if method == 'uniform':
            # Uniform crossover: randomly swap each weight
            for i in range(len(child1.weights)):
                mask = np.random.random(child1.weights[i].shape) < 0.5
                
                # Swap weights where mask is True
                temp = child1.weights[i].copy()
                child1.weights[i] = np.where(mask, parent2.weights[i], parent1.weights[i])
                child2.weights[i] = np.where(mask, parent1.weights[i], parent2.weights[i])
                
                # Swap biases
                mask_bias = np.random.random(child1.biases[i].shape) < 0.5
                child1.biases[i] = np.where(mask_bias, parent2.biases[i], parent1.biases[i])
                child2.biases[i] = np.where(mask_bias, parent1.biases[i], parent2.biases[i])
        
        elif method == 'single_point':
            # Single-point crossover: swap layers after random point
            crossover_point = np.random.randint(1, len(child1.weights))
            
            for i in range(crossover_point, len(child1.weights)):
                child1.weights[i], child2.weights[i] = \
                    child2.weights[i].copy(), child1.weights[i].copy()
                child1.biases[i], child2.biases[i] = \
                    child2.biases[i].copy(), child1.biases[i].copy()
        
        return child1, child2
    
    def evolve(self, population: Population) -> Population:
        """
        Create next generation through selection, crossover, and mutation.
        
        Args:
            population: Current population with fitness scores set
            
        Returns:
            New population for next generation
        """
        self.generation += 1
        
        # Track statistics
        best_fitness = max(population.fitness_scores)
        avg_fitness = sum(population.fitness_scores) / len(population.fitness_scores)
        self.best_fitness_history.append(best_fitness)
        self.avg_fitness_history.append(avg_fitness)
        
        # Sort by fitness (descending)
        sorted_indices = np.argsort(population.fitness_scores)[::-1]
        
        new_networks: List[NeuralNetwork] = []
        
        # Elitism: preserve top performers
        elite_count = max(1, int(self.population_size * self.elitism_rate))
        for i in range(elite_count):
            new_networks.append(population.networks[sorted_indices[i]].copy())
        
        # Generate rest of population
        while len(new_networks) < self.population_size:
            # Select parents
            parent1 = self.tournament_selection(population)
            parent2 = self.tournament_selection(population)
            
            # Crossover or clone
            if np.random.random() < self.crossover_rate:
                child1, child2 = self.crossover(parent1, parent2)
            else:
                child1, child2 = parent1.copy(), parent2.copy()
            
            # Mutate
            child1.mutate(self.mutation_rate, self.mutation_strength)
            child2.mutate(self.mutation_rate, self.mutation_strength)
            
            new_networks.append(child1)
            if len(new_networks) < self.population_size:
                new_networks.append(child2)
        
        # Create new population
        new_population = Population(self.population_size, population.layer_sizes)
        new_population.networks = new_networks
        
        return new_population
    
    def get_statistics(self) -> dict:
        """Get evolution statistics."""
        return {
            'generation': self.generation,
            'best_fitness_history': self.best_fitness_history,
            'avg_fitness_history': self.avg_fitness_history,
            'current_best_fitness': self.best_fitness_history[-1] if self.best_fitness_history else 0,
            'current_avg_fitness': self.avg_fitness_history[-1] if self.avg_fitness_history else 0,
            'improvement': self._calculate_improvement()
        }
    
    def _calculate_improvement(self) -> float:
        """Calculate fitness improvement over last 10 generations."""
        if len(self.best_fitness_history) < 10:
            return 0.0
        
        recent = self.best_fitness_history[-10:]
        return (recent[-1] - recent[0]) / max(abs(recent[0]), 1)
    
    def adaptive_mutation(self) -> None:
        """
        Adjust mutation rate based on fitness improvement.
        Increases mutation if stuck, decreases if improving.
        """
        improvement = self._calculate_improvement()
        
        if improvement < 0.01:  # Stagnating
            self.mutation_rate = min(0.2, self.mutation_rate * 1.1)
            self.mutation_strength = min(0.5, self.mutation_strength * 1.1)
        elif improvement > 0.1:  # Improving well
            self.mutation_rate = max(0.01, self.mutation_rate * 0.95)
            self.mutation_strength = max(0.1, self.mutation_strength * 0.95)
    
    def reset(self) -> None:
        """Reset algorithm state for new simulation."""
        self.generation = 0
        self.best_fitness_history = []
        self.avg_fitness_history = []
