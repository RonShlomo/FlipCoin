import { useEffect, useState } from "react";

export default function PricesTable({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          "https://flipcoin-express-server.onrender.com/posts/prices",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          }
        );

        if (!res.ok) {
          throw new Error("Server error");
        }

        const json = await res.json();
        setData(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
  }, [userId]);
  if (loading) return <p>Loading crypto data...</p>;
  if (!data || Object.keys(data).length === 0)
    return <p>No crypto data found.</p>;

  return (
    <table
      border="1"
      cellPadding="8"
      style={{ borderCollapse: "collapse", width: "80%", margin: "1rem auto" }}
    >
      <thead>
        <tr>
          <th>Coin</th>
          <th>USD</th>
          <th>EUR</th>
          <th>ILS</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([coin, prices]) => (
          <tr key={coin}>
            <td>{coin.charAt(0).toUpperCase() + coin.slice(1)}</td>
            <td>{prices.usd}</td>
            <td>{prices.eur}</td>
            <td>{prices.ils}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
