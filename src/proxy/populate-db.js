import database from '../shared/database';
import { DATABASE_FILES } from '../shared/constants';

const populateDb = async () => {
  console.log(`Populating...`);
  const dbFile = DATABASE_FILES[process.env.NODE_ENV];
  console.log(`Loading database from ${dbFile}`);
  const knex = await database.setupDatabaseStore(dbFile);
  console.log(`Database loaded.`);

  const requestHeaders =
    '{"host":"localhost","pragma":"no-cache","cache-control":"no-cache","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.0 Safari/537.36","sec-fetch-dest":"empty","accept":"*/*","sec-fetch-site":"same-origin"}';
  const responseHeaders =
    '{"server":"nginx/1.17.2","date":"Tue, 11 Feb 2020 10:11:03 GMT","content-type":"application/json; charset=utf-8","transfer-encoding":"chunked"}';
  const requestParams = {
    browser_id: 1,
    method: 'GET',
    url: 'http://localhost/api/posts.json',
    host: 'localhost',
    port: 80,
    http_version: '1.1',
    path: '/api/posts.json',
    ext: 'json',
    request_type: 'fetch',
    request_headers: requestHeaders,
    response_status: 200,
    response_status_message: 'OK',
    response_headers: responseHeaders
  };
  const limit = 10000;

  for (let i = 0; i < limit; i++) {
    // eslint-disable-next-line no-await-in-loop
    const result = await knex('requests').insert(requestParams);
    console.log(`Inserted request ${result[0]}`);
  }

  console.log(`Done.`);
};

if (process.env.NODE_ENV === undefined) {
  throw new Error(
    `You must set the NODE_ENV var!\ni.e. NODE_ENV=development yarn populate-db`
  );
}

populateDb();
