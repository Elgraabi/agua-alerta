CREATE TABLE IF NOT EXISTS citizens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone_number VARCHAR(100) NOT NULL
);