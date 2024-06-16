import csv
from sqlalchemy import create_engine, MetaData, Table, insert
from dotenv import load_dotenv
import os
from datetime import datetime

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

# Replace with your own MySQL credentials
engine = create_engine(
    f"mysql+pymysql://{mysql_params['user']}:{mysql_params['password']}@{mysql_params['host']}:{mysql_params['port']}/{mysql_params['database']}"
)

# Define the metadata
metadata = MetaData()

# Define the mileage table
mileage_table = Table('Mileage', metadata, autoload_with=engine)

# Read data from the CSV file
csv_file = 'migrateDB/vehicle_data.csv'  # Provide the path to your CSV file
mileage_data = []
with open(csv_file, 'r', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    next(reader)  # Skip the header row
    for row in reader:
        vehicle_id = int(row['id'])
        mileage = int(row['mileage'])
        current_datetime = datetime.now()  # Get current datetime
        mileage_data.append({'vehicleID': vehicle_id, 'mileage': mileage, 'updatedAt': current_datetime})

# Insert data into the Mileage table
with engine.connect() as connection:
    for data in mileage_data:
        # Define the insert statement
        ins_stmt = insert(mileage_table).values(data)
        # Execute the insert statement
        connection.execute(ins_stmt)

print("Mileage data inserted into the Mileage table.")
