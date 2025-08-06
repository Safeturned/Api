FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Install git for submodule operations
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy the entire solution including .git directory for submodule access
COPY . .

# Initialize and update submodules
RUN git submodule update --init --recursive

# Copy project file and restore dependencies
COPY ["src/Safeturned.Api.csproj", "src/"]
RUN dotnet restore "src/Safeturned.Api.csproj"

# Copy the rest of the source code
COPY . .
WORKDIR "/src/src"
RUN dotnet build "Safeturned.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Safeturned.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Safeturned.Api.dll"]
