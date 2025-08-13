# build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# copia SOLO el csproj y resto de archivos de proyecto necesarios para el restore
COPY ./src/Api.csproj ./
RUN dotnet restore Api.csproj

# ahora copia el código
COPY ./src/ ./
RUN dotnet publish Api.csproj -c Release -o /out

# runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "Api.dll"]
