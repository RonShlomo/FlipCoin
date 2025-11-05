import React from "react";

export default function CryptoAssets({ formData, setFormData }) {
  const options = ["Bitcoin", "Ethereum", "Solana", "Cardano", "Tether"];

  const toggleAsset = (asset) => {
    const newAssets = formData.assets.includes(asset)
      ? formData.assets.filter((a) => a !== asset)
      : [...formData.assets, asset];
    setFormData({ ...formData, assets: newAssets });
  };

  return (
    <div className="checkbox-group">
      {options.map((asset) => (
        <label
          key={asset}
          className={`checkbox-option ${
            formData.assets.includes(asset) ? "selected" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={formData.assets.includes(asset)}
            onChange={() => toggleAsset(asset)}
          />
          {asset}
        </label>
      ))}
    </div>
  );
}
