// Fixture de transporte: executar com a web compilada em 3000 e a API parada.
// Nenhuma rota deste servidor é adicionada ao aplicativo Nest/Next.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';

let requests = 0;
const cookies = [
  'transport_one=fixture; HttpOnly; Path=/api; SameSite=Lax',
  'transport_two=fixture; HttpOnly; Path=/api; SameSite=Lax',
];
const fixture = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  response.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
    'Set-Cookie': cookies,
  });
  response.end(
    JSON.stringify({
      sequence: ++requests,
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
      body: Buffer.concat(chunks).toString(),
    }),
  );
});

try {
  fixture.listen(3001, '127.0.0.1');
  await once(fixture, 'listening');
  for (const method of ['GET', 'GET', 'POST']) {
    const response = await fetch('http://127.0.0.1:3000/api/transport-fixture?probe=1', {
      method,
      headers: {
        Authorization: 'Bearer transport-fixture',
        Cookie: 'transport_request=fixture',
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? '{"probe":true}' : undefined,
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(response.headers.getSetCookie(), cookies);
    const echoed = await response.json();
    assert.equal(echoed.method, method);
    assert.equal(echoed.url, '/api/transport-fixture?probe=1');
    assert.equal(echoed.authorization, 'Bearer transport-fixture');
    assert.equal(echoed.cookie, 'transport_request=fixture');
    assert.equal(echoed.body, method === 'POST' ? '{"probe":true}' : '');
    assert.equal(echoed.sequence, requests);
  }
  assert.equal(requests, 3, 'Requisições repetidas devem chegar à origem sem cache.');
  console.log(
    'PASS: rewrite preserva método, caminho, query, corpo, Authorization, Cookie, dois Set-Cookie e no-store.',
  );
} finally {
  fixture.closeAllConnections();
  await new Promise((resolve) => fixture.close(resolve));
}
