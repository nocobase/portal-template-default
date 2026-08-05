export interface AppHealthResponse {
  ok: true;
  service: "bff";
  uptime: number;
  timestamp: string;
}

export interface BffDemoResponse {
  ok: true;
  message: string;
  method: string;
  path: string;
  timestamp: string;
  requestId: string;
  server: {
    node: string;
    uptime: number;
  };
}

export interface BffEchoRequest {
  message: string;
}

export interface BffEchoResponse extends BffDemoResponse {
  echo: BffEchoRequest;
  receivedHeaders: {
    userAgent?: string;
    referer?: string;
  };
}
