# syntax=docker/dockerfile:1
FROM node:24-alpine AS client
WORKDIR /work/src/Client
COPY src/Client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY src/Client/ ./
RUN npm run build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /work
COPY . .
COPY --from=client /work/src/Client/dist ./src/Client/dist
RUN dotnet publish src/Server/Mkx.Templates.Server/Mkx.Templates.Server.csproj -c Release -o /out -p:SkipClientBuild=true
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /out ./
ENTRYPOINT ["dotnet","Mkx.Templates.Server.dll"]
