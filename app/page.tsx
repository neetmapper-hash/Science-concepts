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
  class?: number;
  chapter_name?: string;
  chapter_number?: number;
  is_main_topic?: boolean;
};

type Concept = {
  id?: string;
  concept_id?: string;

  subject: string;

  class: number;

  chapter_name: string;

  concept_name: string;

  summary?: string;

  detailed_summary?: string;

  difficulty_level?: string;

  key_terms?: string[];

  aliases?: string[];

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

    const className = `Class ${item.class}`;

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
      tree[subject][className][chapter] =
        {
          concepts: [],
        };
    }

    tree[subject][className][
      chapter
    ].concepts.push(item);
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

  const [expandedPath, setExpandedPath] =
    useState<any>({
      subject: "",
      className: "",
      chapter: "",
    });

  // MERGED DATASET

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

    setExpandedPath({
      subject: concept.subject,
      className: `Class ${concept.class}`,
      chapter: concept.chapter_name,
    });
  }

  // AI QUIZ GENERATOR

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
      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoadingQuiz(false);
    }
  }

  const tree = useMemo(
    () => buildTree(allConcepts),
    [allConcepts]
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

    // MAIN NODE

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

    // BUILDS UPON

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

    // CONFUSED WITH

    if (
      Array.isArray(
        selected.frequently_confused_with
      )
    ) {
      selected.frequently_confused_with.forEach(
        (
          item: RelatedConcept,
          idx: number
        ) => {
          if (!item?.concept_name)
            return;

          const nodeId = `fc-${item.concept_name}`;

          nodes.push({
            id: nodeId,

            position: {
              x: 700,
              y: idx * 120,
            },

            data: {
              label: item.concept_name,
            },

            style: {
              background: "#ea580c",
              color: "white",
              borderRadius: 12,
              padding: 10,
            },
          });

          edges.push({
            id: `confused-${idx}`,

            source:
              selected.concept_name,

            target: nodeId,

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
          ([subject, classes]: any) => {

            const hasMatchingConcept =
              Object.values(classes).some(
                (chapters: any) =>
                  Object.values(
                    chapters
                  ).some(
                    (content: any) =>
                      content.concepts.some(
                        (
                          concept: any
                        ) =>
                          concept.concept_name
                            ?.toLowerCase()
                            .includes(
                              search.toLowerCase()
                            )
                      )
                  )
              );

            if (
              search &&
              !hasMatchingConcept
            ) {
              return null;
            }

            return (

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
                    (
                      [
                        className,
                        chapters,
                      ]: any
                    ) => {

                      return (

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
                              (
                                [
                                  chapter,
                                  content,
                                ]: any
                              ) => {

                                return (

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
                                          ) => {

                                            const matchesMain =
                                              concept.concept_name
                                                ?.toLowerCase()
                                                .includes(
                                                  search.toLowerCase()
                                                );

                                            const subtopics =
                                              allConcepts.filter(
                                                (
                                                  x
                                                ) =>
                                                  x.parent_concept_name ===
                                                  concept.concept_name
                                              );

                                            const filteredSubtopics =
                                              subtopics.filter(
                                                (
                                                  sub: any
                                                ) =>
                                                  sub.concept_name
                                                    ?.toLowerCase()
                                                    .includes(
                                                      search.toLowerCase()
                                                    )
                                              );

                                            if (
                                              search &&
                                              !matchesMain &&
                                              filteredSubtopics.length ===
                                                0
                                            ) {
                                              return null;
                                            }

                                            return (

                                              <div
                                                key={
                                                  concept.concept_name
                                                }
                                              >

                                                {/* MAIN */}

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

                                                {/* SUBTOPICS */}

                                                {filteredSubtopics.length >
                                                  0 && (

                                                  <div className="ml-4 mt-1 space-y-1">

                                                    {filteredSubtopics.map(
                                                      (
                                                        sub: any
                                                      ) => (

                                                        <button
                                                          key={
                                                            sub.concept_name
                                                          }
                                                          onClick={() =>
                                                            selectConcept(
                                                              sub
                                                            )
                                                          }
                                                          className={`block text-left text-sm px-2 py-1 rounded-lg hover:text-blue-500 ${
                                                            selected?.concept_name ===
                                                            sub.concept_name
                                                              ? "bg-blue-100 text-blue-700"
                                                              : "text-gray-700"
                                                          }`}
                                                        >
                                                          •{" "}
                                                          {
                                                            sub.concept_name
                                                          }
                                                        </button>
                                                      )
                                                    )}

                                                  </div>

                                                )}

                                              </div>
                                            );
                                          }
                                        )}

                                    </div>

                                  </details>
                                );
                              }
                            )}

                          </div>

                        </details>
                      );
                    }
                  )}

                </div>

              </details>
            );
          }
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

                {selected.difficulty_level && (

                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
                    {
                      selected.difficulty_level
                    }
                  </span>

                )}

              </div>

              <div className="text-gray-500 capitalize">
                {selected.subject} •
                Class{" "}
                {selected.class}
              </div>

              <div className="text-gray-500">
                {
                  selected.chapter_name
                }
              </div>

              {/* MOCK TEST BUTTON */}

              <div className="mt-5">

                <button
                  onClick={generateQuiz}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl"
                >
                  {loadingQuiz
                    ? "Generating..."
                    : "Mock Test"}
                </button>

              </div>

            </div>

            {/* MOCK TEST */}

            {showMockTest && (

              <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

                <div className="flex items-center justify-between mb-8">

                  <div>

                    <h2 className="text-3xl font-bold">
                      Mock Test
                    </h2>

                    <p className="text-gray-500 mt-2">
                      {
                        selected.chapter_name
                      }
                    </p>

                  </div>

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

                        <h3 className="font-semibold text-xl mb-5">
                          Q{idx + 1}.{" "}
                          {q.question}
                        </h3>

                        <div className="space-y-3">

                          {q.options?.map(
                            (
                              option: string,
                              optionIdx: number
                            ) => (

                              <button
                                key={optionIdx}
                                className="block w-full text-left border rounded-2xl px-5 py-4 hover:bg-blue-50"
                              >
                                {option}
                              </button>

                            )
                          )}

                        </div>

                        <div className="mt-5 text-sm text-gray-500">

                          <strong>
                            Answer:
                          </strong>{" "}
                          {q.answer}

                        </div>

                        <div className="mt-2 text-sm text-gray-600">

                          <strong>
                            Explanation:
                          </strong>{" "}
                          {q.explanation}

                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

            {/* BRIEF EXPLANATION */}

            <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

              <h2 className="text-2xl font-semibold mb-4">
                Brief
                Explanation
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