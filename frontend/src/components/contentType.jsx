import React from "react";

export default function ContentType({ formData, setFormData }) {
  const options = ["Market News", "Charts", "Social", "Fun"];

  const handleCheckboxChange = (e) => {
    const value = e.target.value;
    const newContentType = formData.contentType.includes(value)
      ? formData.contentType.filter((c) => c !== value)
      : [...formData.contentType, value];

    setFormData({ ...formData, contentType: newContentType });
  };

  return (
    <div className="options">
      {options.map((content) => (
        <label
          key={content}
          className={`option ${
            formData.contentType.includes(content) ? "selected" : ""
          }`}
        >
          <input
            type="checkbox"
            name="contentType"
            value={content}
            checked={formData?.contentType?.includes(content) || false}
            onChange={handleCheckboxChange}
          />
          {content}
        </label>
      ))}
    </div>
  );
}
