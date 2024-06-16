import csv
from sqlalchemy import create_engine, MetaData, Table, select, column, text
from dotenv import load_dotenv
import os

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

# Define the table schema
metadata = MetaData()
vehicle_table = Table('Vehicle', metadata, autoload_with=engine)

# Connect to the database and fetch the data
with engine.connect() as connection:
    # stmt = select([vehicle_table.c.id, vehicle_table.c.mileage])
    stmt = select(column('id'), column('mileage')).select_from(text('Vehicle'))
    result = connection.execute(stmt)
    data = result.fetchall()

# Write the data to a CSV file
    # Get the current directory
current_directory = os.getcwd()

# Define the file path for the CSV file
file_path = os.path.join(current_directory, 'vehicle_data.csv')
with open(file_path, 'w', newline='') as csvfile:
    fieldnames = ['id', 'mileage']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

    writer.writeheader()
    for row in data:
        writer.writerow({'id': row.id, 'mileage': row.mileage})

print("Vehicle data written to vehicle_data.csv")
