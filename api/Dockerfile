# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ./src/ ./
RUN dotnet restore Api.csproj
RUN dotnet publish Api.csproj -c Release -o /out


# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
EXPOSE 8085
ENV ASPNETCORE_URLS=http://+:8085
ENTRYPOINT ["dotnet", "Api.dll"]
