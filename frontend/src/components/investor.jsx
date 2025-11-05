import React from "react";

export default function Investor({ formData, setFormData }) {
  const options = ["HODLer", "Day Trader", "NFT Collector"];

  const handleChange = (e) => {
    setFormData({ ...formData, investorType: e.target.value });
  };

  return (
    <div className="radio-group">
      {options.map((type) => (
        <label
          key={type}
          className={`radio-option ${
            formData.investorType === type ? "selected" : ""
          }`}
        >
          <input
            type="radio"
            name="investorType"
            value={type}
            checked={formData.investorType === type}
            onChange={handleChange}
          />
          {type}
        </label>
      ))}
    </div>
  );
}
