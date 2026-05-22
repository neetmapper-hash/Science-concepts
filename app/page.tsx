"use client";

import { useMemo, useState } from "react";

import biologyData from "./data/biology_concepts.json";
import physicsData from "./data/physics_concepts.json";
import chemData from "./data/chem_concepts.json";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from "reactflow";

import "reactflow/dist/style.css";

type RelatedConcept = {
  concept_id?: string;
  concept_name: string;
};

type Concept = {
  subject: string;
  class: number;
  chapter_name: string;
  concept_name: string;
  summary?: string;
  difficulty_level?: string;
  key_terms?: string[];
  is_main_topic?: boolean;
  parent_concept_name?: string;
  builds_upon?: any;
  frequently_confused_with?: any;
};

function buildTree(concepts: Concept[]) {

  const tree: any = {};

  concepts.forEach((item) => {

    const subject =
      item.subject || "Unknown";

    const className =
      `Class ${item.class}`;

    const chapter =
      item.chapter_name ||
      "Unknown Chapter";

    if (!tree[subject]) {
      tree[subject] = {};
    }

    if (!tree[subject][className]) {
      tree[subject][className] = {};
    }

    if (
      !tree[subject][className][chapter]
    ) {

      tree[subject][className][chapter] = {
        concepts: [],
      };
    }

    tree[subject][className][chapter]
      .concepts.push(item);
  });

  return tree;
}

export default function Home() {

  const [selected, setSelected] =
    useState<any>(null);

  const [search, setSearch] =
    useState("");

  const [showMockTest, setShowMockTest] =
    useState(false);

  const [loadingQuiz, setLoadingQuiz] =
    useState(false);

  const [quizQuestions, setQuizQuestions] =
    useState<any[]>([]);

  const [selectedAnswers, setSelectedAnswers] =
    useState<any>({});

  const [assertionMode, setAssertionMode] =
    useState(false);

  const allConcepts = useMemo(() => {

    return [
      ...(biologyData as Concept[]),

      ...(physicsData as Concept[]),

      ...(chemData as Concept[]),
    ];

  }, []);

  function selectConcept(concept: any) {

    setSelected(concept);

    setShowMockTest(false);

    setSelectedAnswers({});
  }

  async function generateQuiz() {

    if (!selected) return;

    setLoadingQuiz(true);

    try {

      const chapterConcepts =
        allConcepts.filter(
          (x) =>
            x.chapter_name ===
              selected.chapter_name &&
            x.class ===
              selected.class &&
            x.subject ===
              selected.subject
        );

      const response = await fetch(
        "/api/generate-quiz",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            subject:
              selected.subject,

            classLevel:
              selected.class,

            chapter:
              selected.chapter_name,

            concepts:
              chapterConcepts,
          }),
        }
      );

      const data =
        await response.json();

      if (data.success) {

        setQuizQuestions(
          data.questions
        );

        setShowMockTest(true);

        setAssertionMode(false);

        setSelectedAnswers({});
      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoadingQuiz(false);
    }
  }

  async function generateAssertionQuiz() {

    if (!selected) return;

    setLoadingQuiz(true);

    try {

      const chapterConcepts =
        allConcepts.filter(
          (x) =>
            x.chapter_name ===
              selected.chapter_name &&
            x.class ===
              selected.class &&
            x.subject ===
              selected.subject
        );

      const response = await fetch(
        "/api/generate-quiz",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            subject:
              selected.subject,

            classLevel:
              selected.class,

            chapter:
              selected.chapter_name,

            concepts:
              chapterConcepts,

            mode:
              "assertion_reasoning",
          }),
        }
      );

      const data =
        await response.json();

      if (data.success) {

        setQuizQuestions(
          data.questions
        );

        setShowMockTest(true);

        setAssertionMode(true);

        setSelectedAnswers({});
      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoadingQuiz(false);
    }
  }

  const filteredConcepts =
    useMemo(() => {

      if (!search.trim()) {
        return allConcepts;
      }

      return allConcepts.filter(
        (concept) =>
          concept.concept_name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          concept.chapter_name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
      );

    }, [search, allConcepts]);

  const tree = useMemo(
    () =>
      buildTree(filteredConcepts),
    [filteredConcepts]
  );

  const conceptMap = useMemo(() => {

    const map: any = {};

    allConcepts.forEach((item) => {

      map[item.concept_name] = item;
    });

    return map;

  }, [allConcepts]);

  const graphData = useMemo(() => {

    if (!selected) {

      return {
        nodes: [],
        edges: [],
      };
    }

    const nodes: any[] = [];
    const edges: any[] = [];

    nodes.push({
      id: selected.concept_name,

      position: {
        x: 400,
        y: 200,
      },

      data: {
        label: selected.concept_name,
      },

      style: {
        background: "#2563eb",
        color: "white",
        borderRadius: 12,
        padding: 10,
        fontWeight: "bold",
      },
    });

    if (
      Array.isArray(selected.builds_upon)
    ) {

      selected.builds_upon.forEach(
        (
          item: RelatedConcept,
          idx: number
        ) => {

          if (!item?.concept_name)
            return;

          nodes.push({
            id: item.concept_name,

            position: {
              x: 100,
              y: idx * 120,
            },

            data: {
              label: item.concept_name,
            },

            style: {
              background: "#9333ea",
              color: "white",
              borderRadius: 12,
              padding: 10,
            },
          });

          edges.push({
            id: `build-${idx}`,

            source:
              item.concept_name,

            target:
              selected.concept_name,

            animated: true,
          });
        }
      );
    }

    return {
      nodes,
      edges,
    };

  }, [selected]);

  return (

    <main className="h-screen flex bg-gray-100">

      {/* SIDEBAR */}

      <div className="w-[380px] bg-white border-r overflow-y-auto p-4">

        <h1 className="text-2xl font-bold mb-4">
          Science Explorer
        </h1>

        {/* SEARCH */}

        <div className="mb-5">

          <input
            type="text"
            placeholder="Search concepts..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400"
          />

        </div>

        {Object.entries(tree).map(
          ([subject, classes]: any) => (

            <details
              key={subject}
              open
              className="mb-4"
            >

              <summary className="cursor-pointer text-lg font-bold capitalize">
                {subject}
              </summary>

              <div className="ml-4 mt-2">

                {Object.entries(classes).map(
                  ([className, chapters]: any) => (

                    <details
                      key={className}
                      open
                      className="mb-3"
                    >

                      <summary className="cursor-pointer font-semibold">
                        {className}
                      </summary>

                      <div className="ml-4 mt-2">

                        {Object.entries(
                          chapters
                        ).map(
                          ([chapter, content]: any) => (

                            <details
                              key={chapter}
                              open
                              className="mb-3"
                            >

                              <summary className="cursor-pointer text-blue-700">
                                {chapter}
                              </summary>

                              <div className="ml-4 mt-2 space-y-3">

                                {content.concepts
                                  .filter(
                                    (
                                      concept: any
                                    ) =>
                                      !concept.parent_concept_name &&
                                      concept.is_main_topic
                                  )
                                  .map(
                                    (
                                      concept: any
                                    ) => (

                                      <div
                                        key={
                                          concept.concept_name
                                        }
                                      >

                                        <button
                                          onClick={() =>
                                            selectConcept(
                                              concept
                                            )
                                          }
                                          className={`block text-left font-medium hover:text-blue-600 px-2 py-1 rounded-lg ${
                                            selected?.concept_name ===
                                            concept.concept_name
                                              ? "bg-blue-100 text-blue-700"
                                              : ""
                                          }`}
                                        >
                                          {
                                            concept.concept_name
                                          }
                                        </button>

                                      </div>
                                    )
                                  )}

                              </div>

                            </details>
                          )
                        )}

                      </div>

                    </details>
                  )
                )}

              </div>

            </details>
          )
        )}

      </div>

      {/* RIGHT PANEL */}

      <div className="flex-1 overflow-y-auto bg-gray-50">

        {!selected ? (

          <div className="h-full flex items-center justify-center text-2xl text-gray-400">
            Select a concept
          </div>

        ) : (

          <div className="max-w-6xl mx-auto p-8">

            {/* HEADER */}

            <div className="mb-8">

              <div className="flex items-center gap-4 mb-4">

                <h1 className="text-5xl font-bold">
                  {
                    selected.concept_name
                  }
                </h1>

              </div>

              <div className="text-gray-500 capitalize">
                {selected.subject} •
                Class {selected.class}
              </div>

              <div className="text-gray-500">
                {
                  selected.chapter_name
                }
              </div>

              {/* BUTTONS */}

              <div className="mt-5 flex gap-4">

                <button
                  onClick={generateQuiz}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl"
                >
                  {loadingQuiz
                    ? "Generating..."
                    : "Mock Test"}
                </button>

                <button
                  onClick={
                    generateAssertionQuiz
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl"
                >
                  Assertion &
                  Reasoning
                </button>

              </div>

            </div>

            {/* PREREQUISITES */}

            {selected.builds_upon?.length >
              0 && (

              <div className="bg-yellow-50 border rounded-3xl p-6 mb-8">

                <h2 className="text-2xl font-semibold mb-4">
                  Prerequisites
                </h2>

                <div className="flex flex-wrap gap-3">

                  {selected.builds_upon.map(
                    (
                      item: any,
                      idx: number
                    ) => (

                      <button
                        key={idx}
                        onClick={() => {

                          const concept =
                            conceptMap[
                              item.concept_name
                            ];

                          if (concept) {
                            selectConcept(
                              concept
                            );
                          }
                        }}
                        className="bg-white border px-4 py-2 rounded-xl hover:bg-yellow-100"
                      >
                        {
                          item.concept_name
                        }
                      </button>
                    )
                  )}

                </div>

              </div>
            )}

            {/* QUIZ */}

            {showMockTest && (

              <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

                <div className="flex items-center justify-between mb-8">

                  <h2 className="text-3xl font-bold">
                    {assertionMode
                      ? "Assertion & Reasoning Test"
                      : "Mock Test"}
                  </h2>

                  <button
                    onClick={() =>
                      setShowMockTest(false)
                    }
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl"
                  >
                    Close
                  </button>

                </div>

                <div className="space-y-10">

                  {quizQuestions.map(
                    (q, idx) => (

                      <div
                        key={idx}
                        className="border-b pb-8"
                      >

                        <div className="flex items-center gap-3 mb-5">

                          <h3 className="font-semibold text-xl">
                            Q{idx + 1}.{" "}
                            {q.question}
                          </h3>

                          <span className="text-xs px-3 py-1 rounded-full bg-gray-100">

                            {q.difficulty}

                          </span>

                        </div>

                        {q.assertion && (

                          <div className="mb-5 space-y-3">

                            <div className="bg-blue-50 p-4 rounded-2xl">

                              <strong>
                                Assertion:
                              </strong>{" "}
                              {
                                q.assertion
                              }

                            </div>

                            <div className="bg-purple-50 p-4 rounded-2xl">

                              <strong>
                                Reason:
                              </strong>{" "}
                              {q.reason}

                            </div>

                          </div>
                        )}

                        <div className="space-y-3">

                          {q.options?.map(
                            (
                              option: string,
                              optionIdx: number
                            ) => {

                              const selectedOption =
                                selectedAnswers[
                                  idx
                                ];

                              const isCorrect =
                                option ===
                                q.answer;

                              const isSelected =
                                selectedOption ===
                                option;

                              let buttonClass =
                                "block w-full text-left border rounded-2xl px-5 py-4 ";

                              if (
                                selectedOption
                              ) {

                                if (
                                  isCorrect
                                ) {

                                  buttonClass +=
                                    "bg-green-100 border-green-500";

                                } else if (
                                  isSelected
                                ) {

                                  buttonClass +=
                                    "bg-red-100 border-red-500";

                                } else {

                                  buttonClass +=
                                    "bg-gray-50";
                                }

                              } else {

                                buttonClass +=
                                  "hover:bg-blue-50";
                              }

                              return (

                                <div
                                  key={
                                    optionIdx
                                  }
                                >

                                  <button
                                    disabled={
                                      !!selectedOption
                                    }
                                    onClick={() =>
                                      setSelectedAnswers(
                                        (
                                          prev: any
                                        ) => ({
                                          ...prev,
                                          [idx]:
                                            option,
                                        })
                                      )
                                    }
                                    className={
                                      buttonClass
                                    }
                                  >
                                    {option}
                                  </button>

                                  {selectedOption &&
                                    isCorrect && (

                                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-gray-700 leading-7">

                                        <strong>
                                          Explanation:
                                        </strong>

                                        <p className="mt-2">
                                          {
                                            q.explanation
                                          }
                                        </p>

                                      </div>
                                    )}

                                </div>
                              );
                            }
                          )}

                        </div>

                      </div>
                    )
                  )}

                </div>

                {/* MORE QUESTIONS */}

                <div className="mt-10 flex justify-center">

                  <button
                    onClick={() => {

                      if (
                        assertionMode
                      ) {

                        generateAssertionQuiz();

                      } else {

                        generateQuiz();
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl"
                  >
                    More Questions
                  </button>

                </div>

              </div>
            )}

            {/* BRIEF EXPLANATION */}

            <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

              <h2 className="text-2xl font-semibold mb-4">
                Brief Explanation
              </h2>

              <p className="text-lg leading-8 text-gray-700">
                {selected.summary ||
                  "No explanation available"}
              </p>

            </div>

            {/* GRAPH */}

            <div className="bg-white rounded-3xl border shadow-sm p-8">

              <h2 className="text-2xl font-semibold mb-6">
                Concept Graph
              </h2>

              <div className="h-[500px] rounded-2xl overflow-hidden border">

                <ReactFlow
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  fitView
                  onNodeClick={(
                    _,
                    node
                  ) => {

                    const concept =
                      conceptMap[
                        node.data.label
                      ];

                    if (concept) {
                      selectConcept(
                        concept
                      );
                    }
                  }}
                >

                  <MiniMap />
                  <Controls />
                  <Background />

                </ReactFlow>

              </div>

            </div>

          </div>
        )}

      </div>

    </main>
  );
}