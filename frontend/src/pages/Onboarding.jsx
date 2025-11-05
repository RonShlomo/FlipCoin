import React, { useState } from "react";
import OnboardForm from "../components/OnboardForm";
import { useLocation } from "react-router-dom";

export default function Onboarding() {
  const location = useLocation();
  const state = location.state;
  const { id, username } = state || {};
  console.log("username = ", username, ", id - ", id);

  return <OnboardForm username={username} id={id}></OnboardForm>;
}
