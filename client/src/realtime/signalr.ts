import * as signalR from "@microsoft/signalr";

export function createHubConnection(getToken: () => string | null) {
  const url = import.meta.env.VITE_SIGNALR_URL || (import.meta.env.VITE_API_URL + "/hubs/notifications");

  const conn = new signalR.HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => getToken() ?? "",
    })
    .withAutomaticReconnect()
    .build();

  return conn;
}
