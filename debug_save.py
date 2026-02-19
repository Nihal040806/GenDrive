import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("1. Checking Health...")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print("Health Response:", r.json())
        if r.status_code != 200:
            print("FAILED: Health check failed")
            return
    except Exception as e:
        print(f"FAILED: Could not connect to backend: {e}")
        return

    print("\n2. Initializing Simulation...")
    config = {
        "population_size": 10,
        "layer_sizes": [5, 6, 4, 2],
        "mutation_rate": 0.05,
        "mutation_strength": 0.3,
        "crossover_rate": 0.7,
        "elitism_rate": 0.05,
        "tournament_size": 5
    }
    r = requests.post(f"{BASE_URL}/simulation/initialize", json=config)
    print("Init Response:", r.status_code)
    if r.status_code != 200:
        print("FAILED: Init failed", r.text)
        return
    
    print("\n3. getting best genome (initial)...")
    r = requests.get(f"{BASE_URL}/simulation/best-genome")
    if r.status_code200:
         # It might fail if no evolution happened yet, but let's see
         # Actually initialization creates a random population, so best genome should exist
         pass
    
    # Let's try to save a dummy genome
    print("\n4. Saving Genome...")
    dummy_genome = {
        "layer_sizes": [5, 6, 4, 2],
        "weights": [[[0.1]*6]*5, [[0.1]*4]*6, [[0.1]*2]*4], # simplified 
        "biases": [[[0.1]*6], [[0.1]*4], [[0.1]*2]]
    }
    
    # We need to match the structure exactly. 
    # Let's use the one from initialization if possible, or construct a valid one.
    # The initialization returns 'genomes'.
    
    # Actually, init response has genomes
    genomes = r.json().get("genomes", [])
    if not genomes and "genomes" in run_test.__dict__: # checking previous request response 
         pass
         
    # Better: Get the best genome from the API
    r_best = requests.get(f"{BASE_URL}/simulation/best-genome")
    if r_best.status_code == 200:
        genome_data = r_best.json()
    else:
        print("Could not get best genome, constructing dummy...")
        # Constructing a valid dummy is hard without knowing exact dimensions expected by validation if we mess up.
        # But we know [5, 6, 4, 2]
        # Weights: 
        # 5 -> 6: [5][6]
        # 6 -> 4: [6][4]
        # 4 -> 2: [4][2]
        w1 = [[0.1 for _ in range(6)] for _ in range(5)]
        w2 = [[0.1 for _ in range(4)] for _ in range(6)]
        w3 = [[0.1 for _ in range(2)] for _ in range(4)]
        
        b1 = [[0.1 for _ in range(6)]]
        b2 = [[0.1 for _ in range(4)]]
        b3 = [[0.1 for _ in range(2)]]
        
        genome_data = {
            "layer_sizes": [5, 6, 4, 2],
            "weights": [w1, w2, w3],
            "biases": [b1, b2, b3]
        }

    save_payload = {
        "name": "test_genome_v1",
        "genome": genome_data,
        "fitness": 100.5,
        "generation": 1,
        "description": "Test genome from script"
    }
    
    r_save = requests.post(f"{BASE_URL}/genomes/save", json=save_payload)
    print("Save Response:", r_save.status_code, r_save.text)
    
    if r_save.status_code == 200:
        print("SUCCESS: Genome saved")
    else:
        print("FAILED: Genome save failed")
        return

    print("\n5. Listing Genomes...")
    r_list = requests.get(f"{BASE_URL}/genomes/list")
    print("List Response:", r_list.status_code)
    genomes = r_list.json()
    found = False
    for g in genomes:
        if g['name'] == "test_genome_v1":
            print(f"FOUND: {g['name']} with fitness {g['fitness']}")
            found = True
            break
            
    if found:
        print("VERIFIED: Genome persisted in DB")
    else:
        print("FAILED: Genome not found in list")

if __name__ == "__main__":
    run_test()
