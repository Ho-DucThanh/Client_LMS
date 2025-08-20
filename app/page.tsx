"use client";
import React, { FC, useState } from "react";
import Heading from "./utils/Heading";
import Header from "./components/Header";
import Hero from "./components/Hero";

interface Props {}

const Page: FC<Props> = (props) => {
  return (
    <div>
      <Heading
        title="ELearning - Online Learning Platform"
        description="ELearning is a comprehensive online learning platform offering courses in programming, technology, and more"
        keywords="Programming, MERN, Redux, Machine Learning, Online Learning, Courses"
      />
      <Header />
      <Hero />
    </div>
  );
};

export default Page;
