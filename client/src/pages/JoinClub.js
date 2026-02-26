import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function JoinClub() {

  const { inviteCode } = useParams();

  const navigate = useNavigate();

  useEffect(() => {

    joinClub();

  }, []);

  const joinClub = async () => {

    try {

      const token = localStorage.getItem("token");

      await axios.post(
        `http://localhost:5000/api/clubs/join/${inviteCode}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Joined club successfully");

      navigate("/clubs");

    } catch (error) {

      alert("Failed to join club");

      navigate("/clubs");

    }

  };

  return (

    <div className="flex justify-center items-center h-screen">

      <h1 className="text-xl font-bold">
        Joining club...
      </h1>

    </div>

  );

}

export default JoinClub;