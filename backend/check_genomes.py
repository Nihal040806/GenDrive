import sqlite3
import os

DB_PATH = os.path.join("data", "simulation.db")

def check_genomes():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, name, fitness, generation, created_at FROM genomes")
        rows = cursor.fetchall()
        
        print(f"Found {len(rows)} genomes:")
        for row in rows:
            print(f"ID: {row[0]}, Name: {row[1]}, Fitness: {row[2]}, Gen: {row[3]}, Date: {row[4]}")
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_genomes()
