import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import CryptoMeme from "../components/CryptoMeme";
import PricesTable from "../components/PricesTable";
import News from "../components/News";
import AIInsight from "../components/AIInsight";
import Section from "../components/Section";
import "./Dashboard.css";

export default function Dashboard() {
  const location = useLocation();
  const state = location.state;
  const { id, username } = state || {};
  console.log("username = ", username, ", id - ", id);
  const navigate = useNavigate();

  return (
    <div>
      <button
        className="top-btn"
        onClick={() => {
          navigate("/");
        }}
      >
        Log Out
      </button>
      <h1>Welcome, {username}!</h1>

      <Section userId={id} contentType={"Market News"} title="Market News">
        <News userId={id} />
      </Section>

      <Section userId={id} contentType={"Coin Prices"} title="Coin Prices">
        <PricesTable userId={id} />
      </Section>

      <Section userId={id} contentType={"Memes"} title="Just For Laughs">
        <CryptoMeme userId={id} />
      </Section>

      <Section userId={id} contentType={"AI tip"} title="AI Insight of the Day">
        <AIInsight userId={id} />
      </Section>
    </div>
  );
}
