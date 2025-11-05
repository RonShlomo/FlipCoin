import { useState } from "react";
import CryptoAssets from "./crypto-assets";
import ContentType from "./contentType";
import Investor from "./investor";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./OnboardForm.css";

export default function OnboardForm({ username, id }) {
  const [page, setPage] = useState(0);
  const [formData, setFormData] = useState({
    assets: [],
    investorType: "",
    contentType: [],
  });
  console.log("username = ", username, ", id - ", id);

  const navigate = useNavigate();

  const formTitles = [
    "Onboarding",
    "What crypto assets are you interested in?",
    "What type of investor are you?",
    "What kind of content would you like to see?",
  ];

  const PageDisplay = () => {
    switch (page) {
      case 1:
        return <CryptoAssets formData={formData} setFormData={setFormData} />;
      case 2:
        return <Investor formData={formData} setFormData={setFormData} />;
      case 3:
        return <ContentType formData={formData} setFormData={setFormData} />;
      default:
        return (
          <div className="welcome">
            Welcome {username}, let's get to know you
          </div>
        );
    }
  };

  const handleNext = async () => {
    if (page === 1 && formData.assets.length === 0) {
      toast.error("Please select at least one crypto asset.");
      return;
    }
    if (page === 2 && !formData.investorType) {
      toast.error("Please select an investor type.");
      return;
    }
    if (page === 3 && formData.contentType.length === 0) {
      toast.error("Please select what kind of content you'd like.");
      return;
    }
    if (page === formTitles.length - 1) {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
      };
      try {
        const res = await fetch("http://localhost:5050/users/onboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to submit form");
        }
        navigate("/dashboard", {
          state: {
            id,
            username,
          },
        });
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
      }
    } else {
      setPage((currPage) => currPage + 1);
    }
  };

  return (
    <div className="OBform">
      <div className="form-container">
        <div className="form-header">{formTitles[page]}</div>
        <ToastContainer position="top-center" />

        <div className="form-body">{PageDisplay()}</div>

        <div className="form-footer">
          {page > 0 && (
            <button onClick={() => setPage((currPage) => currPage - 1)}>
              Prev
            </button>
          )}

          <button onClick={handleNext}>
            {page === formTitles.length - 1 ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
