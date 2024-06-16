import os
import pandas as pd
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MySQL database connection parameters
mysql_params = {
    "user": os.getenv("MYSQL_DB_USER"),
    "password": os.getenv("MYSQL_DB_PASSWORD"),
    "host": os.getenv("MYSQL_DB_HOST"),
    "port": os.getenv("MYSQL_DB_PORT"),
    "database": os.getenv("MYSQL_DB_DATABASE"),
}

# Directory containing PostgreSQL CSV backups
backup_dir = "./backups/"

# List of table names with the first letter capitalized
tables = [
    "Role",
    "User",
    "CustomerType",
    "Customer",
    "VehicleType",
    "Vehicle",
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

# Create a MySQL database connection using SQLAlchemy
mysql_engine = create_engine(
    f"mysql+pymysql://{mysql_params['user']}:{mysql_params['password']}@{mysql_params['host']}:{mysql_params['port']}/{mysql_params['database']}"
)

# Create an Inspector object for the MySQL database
inspector = inspect(mysql_engine)

try:
    for table_name in tables:
        csv_file = os.path.join(backup_dir, f"{table_name}.csv")

        # Read the CSV file into a Pandas DataFrame
        df = pd.read_csv(csv_file)

        # Specify the MySQL table name and primary key column
        mysql_table_name = table_name  # Maintain the first letter capitalized
        primary_key = "id"  # Replace with the actual primary key column name

        # Check if the table exists in the MySQL database
        if inspector.has_table(mysql_table_name):
            # Write the remaining rows to the MySQL table
            df.to_sql(mysql_table_name, mysql_engine, if_exists="append", index=False)
            print(f"Data inserted into MySQL for table: {table_name}")
        else:
            print(f"Table {mysql_table_name} does not exist. Skipping insertion.")

except Exception as e:
    print(f"Error: {e}")
finally:
    mysql_engine.dispose()
