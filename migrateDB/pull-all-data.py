import os
from dotenv import load_dotenv
import psycopg2

# Load environment variables from .env file
load_dotenv()

# Get database connection parameters from environment variables
db_params = {
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_DATABASE"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT"),
}

# Directory where backup files will be saved
backup_dir = "./backups/"

# Create the backup directory if it doesn't exist
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)

try:
    # Connect to the PostgreSQL database using psycopg2-binary
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()

    # Get a list of all tables in the database
    tables = [
        "Role",
        "User",
        "Customer",
        "CustomerType",
        "Vehicle",
        "VehicleType",
        "JobType",
        "JobMaterial",
        "Job",
        "Invoice",
        "InvoiceDraft",
        "InvoiceJobMaterial",
        "Estimate",
        "InvoiceDraftJobMaterial",
        "EstimateJobMaterial",

    ]

    # Loop through the tables and create backups
    for table in tables:
        table_name = table
        backup_file = os.path.join(backup_dir, f"{table_name}.csv")

        # Use COPY command to export table data to CSV file
        with open(backup_file, "w") as f:
            print(f"COPY {table_name} TO STDOUT WITH CSV HEADER;")
            cursor.copy_expert(f'COPY "{table_name}" TO STDOUT WITH CSV HEADER;', file=f)

        print(f"Backup created for table: {table_name}")

    # Close the cursor and connection
    cursor.close()
    conn.close()

except psycopg2.Error as e:
    print(f"Error: {e}")
finally:
    # Make sure to close the connection in case of any errors
    if conn:
        conn.close()
