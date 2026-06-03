import mysql2 from "mysql2";

const { createConnection } = mysql2;

function connectionFromEnv() {
  const url = process.env.MEMBERSHIP_CONNECTION_STRING;
  if (url) {
    return createConnection(url);
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || "membership";
  const port = Number(process.env.DB_PORT || 3306);

  if (!host || !user || !password) {
    console.error(
      "Set MEMBERSHIP_CONNECTION_STRING or DB_HOST, DB_USER, and DB_PASSWORD (optional: DB_PORT, DB_NAME)."
    );
    process.exit(1);
  }

  return createConnection({ host, port, user, password, database });
}

const c = connectionFromEnv();

c.query(
  "SELECT id, name, subDomain, address1, city, state, country, registrationDate, archivedDate FROM churches WHERE name LIKE '%Spirit%' OR name LIKE '%Embassy%' ORDER BY registrationDate",
  (e, r) => {
    if (e) {
      console.log("ERR", e.message);
      c.end();
      return;
    }
    console.log("Total matching churches:", r.length);
    console.log(JSON.stringify(r, null, 2));
    c.end();
  }
);
