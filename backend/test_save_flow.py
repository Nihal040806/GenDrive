import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_save():
    # Mock genome data
    genome_data = {
        "weights": [[[0.1, 0.2], [0.3, 0.4]]],
        "biases": [[[0.1, 0.2]]],
        "layer_sizes": [2, 2],
        "activation": "tanh"
    }
    
    # First, try to get best genome
    try:
        print("Fetching best genome...")
        # Initialize simulation first to ensure genome exists
        init_payload = {
            "population_size": 10,
            "layer_sizes": [2, 2],
            "mutation_rate": 0.05,
            "mutation_strength": 0.3,
            "crossover_rate": 0.7,
            "elitism_rate": 0.05,
            "tournament_size": 5
        }
        requests.post(f"{BASE_URL}/simulation/initialize", json=init_payload)
        
        bg_response = requests.get(f"{BASE_URL}/simulation/best-genome")
        if bg_response.status_code != 200:
            print(f"Failed to get best genome: {bg_response.text}")
            return
            
        real_genome = bg_response.json()
        print("Got best genome. Structure keys:", real_genome.keys())
        print("Biases structure depth check:", len(real_genome['biases']), len(real_genome['biases'][0]), type(real_genome['biases'][0][0]))
        
        # Now try to save THIS genome
        payload = {
            "name": "Live_Roundtrip_Test",
            "genome": real_genome,
            "fitness": 100.0,
            "generation": 5,
            "description": "Saved from fetched best genome"
        }
        
        print("Sending save request with REAL genome data...")
        response = requests.post(f"{BASE_URL}/genomes/save", json=payload)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Error: {e}")
        return

    # Check if listed
    if response and response.status_code == 200:
        print("Save successful. Checking list...")
        try:
            list_response = requests.get(f"{BASE_URL}/genomes/list")
            print(f"List Response: {list_response.text}")
        except Exception as e:
            print(f"Error listing: {e}")

if __name__ == "__main__":
    test_save()
