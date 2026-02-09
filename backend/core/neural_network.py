"""
Neural Network Module
Custom feedforward neural network implementation using NumPy.
All core AI logic for the autonomous navigation simulation.
"""

import numpy as np
from typing import List, Tuple, Optional
import json


class NeuralNetwork:
    """
    Feedforward Neural Network for autonomous agent control.
    
    Architecture:
    - Input Layer: Sensor readings (ray distances)
    - Hidden Layers: Configurable
    - Output Layer: Motor commands (steering, acceleration)
    """
    
    def __init__(self, layer_sizes: List[int]):
        """
        Initialize neural network with random weights.
        
        Args:
            layer_sizes: List of neurons per layer [input, hidden1, ..., output]
                        Example: [5, 6, 4, 2] for 5 inputs, 2 hidden layers, 2 outputs
        """
        self.layer_sizes = layer_sizes
        self.weights: List[np.ndarray] = []
        self.biases: List[np.ndarray] = []
        
        # Initialize weights and biases with Xavier initialization
        for i in range(len(layer_sizes) - 1):
            # Xavier initialization for better gradient flow
            limit = np.sqrt(6 / (layer_sizes[i] + layer_sizes[i + 1]))
            weight = np.random.uniform(-limit, limit, (layer_sizes[i], layer_sizes[i + 1]))
            bias = np.zeros((1, layer_sizes[i + 1]))
            
            self.weights.append(weight)
            self.biases.append(bias)
    
    @staticmethod
    def sigmoid(x: np.ndarray) -> np.ndarray:
        """Sigmoid activation function."""
        # Clip to prevent overflow
        x = np.clip(x, -500, 500)
        return 1 / (1 + np.exp(-x))
    
    @staticmethod
    def relu(x: np.ndarray) -> np.ndarray:
        """ReLU activation function."""
        return np.maximum(0, x)
    
    @staticmethod
    def tanh(x: np.ndarray) -> np.ndarray:
        """Tanh activation function."""
        return np.tanh(x)
    
    def forward(self, inputs: np.ndarray) -> np.ndarray:
        """
        Forward propagation through the network.
        
        Args:
            inputs: Input array of shape (batch_size, input_size) or (input_size,)
            
        Returns:
            Output array of shape (batch_size, output_size)
        """
        # Ensure 2D input
        if inputs.ndim == 1:
            inputs = inputs.reshape(1, -1)
        
        activation = inputs
        
        # Process through hidden layers with ReLU
        for i in range(len(self.weights) - 1):
            z = np.dot(activation, self.weights[i]) + self.biases[i]
            activation = self.relu(z)
        
        # Output layer with tanh for steering (-1 to 1) and sigmoid for acceleration (0 to 1)
        z = np.dot(activation, self.weights[-1]) + self.biases[-1]
        output = np.zeros_like(z)
        
        # Steering: tanh (-1 to 1)
        output[:, 0] = self.tanh(z[:, 0])
        
        # Acceleration: sigmoid (0 to 1)
        if z.shape[1] > 1:
            output[:, 1] = self.sigmoid(z[:, 1])
        
        return output
    
    def get_genome(self) -> dict:
        """
        Serialize neural network to JSON-compatible dictionary.
        
        Returns:
            Dictionary containing layer sizes, weights, and biases
        """
        return {
            'layer_sizes': self.layer_sizes,
            'weights': [w.tolist() for w in self.weights],
            'biases': [b.tolist() for b in self.biases]
        }
    
    @classmethod
    def from_genome(cls, genome: dict) -> 'NeuralNetwork':
        """
        Deserialize neural network from genome dictionary.
        
        Args:
            genome: Dictionary with layer_sizes, weights, biases
            
        Returns:
            NeuralNetwork instance
        """
        nn = cls(genome['layer_sizes'])
        nn.weights = [np.array(w) for w in genome['weights']]
        nn.biases = [np.array(b) for b in genome['biases']]
        return nn
    
    def copy(self) -> 'NeuralNetwork':
        """Create a deep copy of this neural network."""
        nn = NeuralNetwork(self.layer_sizes.copy())
        nn.weights = [w.copy() for w in self.weights]
        nn.biases = [b.copy() for b in self.biases]
        return nn
    
    def mutate(self, mutation_rate: float = 0.05, mutation_strength: float = 0.3) -> None:
        """
        Mutate weights and biases with given probability and strength.
        
        Args:
            mutation_rate: Probability of mutating each weight
            mutation_strength: Standard deviation of mutation noise
        """
        for i in range(len(self.weights)):
            # Mutate weights
            mask = np.random.random(self.weights[i].shape) < mutation_rate
            noise = np.random.randn(*self.weights[i].shape) * mutation_strength
            self.weights[i] += mask * noise
            
            # Mutate biases
            mask = np.random.random(self.biases[i].shape) < mutation_rate
            noise = np.random.randn(*self.biases[i].shape) * mutation_strength
            self.biases[i] += mask * noise


class Population:
    """Manager for a population of neural networks."""
    
    def __init__(self, population_size: int, layer_sizes: List[int]):
        """
        Initialize population with random neural networks.
        
        Args:
            population_size: Number of agents in population
            layer_sizes: Neural network architecture
        """
        self.population_size = population_size
        self.layer_sizes = layer_sizes
        self.networks: List[NeuralNetwork] = [
            NeuralNetwork(layer_sizes) for _ in range(population_size)
        ]
        self.fitness_scores: List[float] = [0.0] * population_size
    
    def evaluate_batch(self, all_inputs: List[np.ndarray]) -> List[np.ndarray]:
        """
        Evaluate all networks with their respective inputs.
        
        Args:
            all_inputs: List of input arrays, one per network
            
        Returns:
            List of output arrays, one per network
        """
        outputs = []
        for nn, inputs in zip(self.networks, all_inputs):
            output = nn.forward(inputs)
            outputs.append(output.flatten())
        return outputs
    
    def set_fitness(self, scores: List[float]) -> None:
        """Set fitness scores for all networks."""
        self.fitness_scores = scores.copy()
    
    def get_best(self, n: int = 1) -> List[Tuple[NeuralNetwork, float]]:
        """Get the n best performing networks with their scores."""
        sorted_indices = np.argsort(self.fitness_scores)[::-1]
        return [(self.networks[i], self.fitness_scores[i]) for i in sorted_indices[:n]]
    
    def get_all_genomes(self) -> List[dict]:
        """Get genomes of all networks."""
        return [nn.get_genome() for nn in self.networks]
    
    def set_all_genomes(self, genomes: List[dict]) -> None:
        """Set all networks from genome list."""
        self.networks = [NeuralNetwork.from_genome(g) for g in genomes]
        self.population_size = len(genomes)
