## Installing Docker containers:

**Docker Machine:** `docker-machine start && docker-machine env`

**Postgres:** `docker run --name gobarber-postgres -p 5432:5432 -d -e POSTGRES_PASSWORD=docker postgres`

**Mongo:** `docker run --name gobarber-mongo -p 27017:27017 -d mongo`

**Redis:** `docker run --name gobarber-redis -p 6379:6379 -d redis:alpine`

## Running Docker containers:

**Docker Machine:** `docker-machine start && docker-machine env`

**Postgres:** `docker start gobarber-postgres`

**Mongo:** `docker start gobarber-mongo`

**Redis:** `docker start gobarber-redis`
