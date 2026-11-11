import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  it("retorna 200 com status ok, uptime e timestamp", async () => {
    const response = await GET(new Request("http://localhost/api/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("não consulta o banco sem o parâmetro db=1", async () => {
    const response = await GET(new Request("http://localhost/api/health"));
    const body = await response.json();

    expect(body).not.toHaveProperty("database");
  });
});
