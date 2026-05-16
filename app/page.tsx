"use client";

import { useMemo, useState } from "react";
import data from "./data/concepts.json";

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
    const subject = item.subject || "Unknown";

    const className = `Class ${item.class}`;

    const chapter =
      item.chapter_name || "Unknown Chapter";

    if (!tree[subject]) {
      tree[subject] = {};
    }

    if (!tree[subject][className]) {
      tree[subject][className] = {};
    }

    if (!tree[subject][className][chapter]) {
      tree[subject][className][chapter] = {
        concepts: [],
      };
    }

    tree[subject][className][chapter].concepts.push(
      item
    );
  });

  return tree;
}

export default function Home() {
  const [selected, setSelected] =
    useState<any>(null);

  const [expandedPath, setExpandedPath] =
    useState<any>({
      subject: "",
      className: "",
      chapter: "",
    });

  function selectConcept(concept: any) {
    setSelected(concept);

    setExpandedPath({
      subject: concept.subject,
      className: `Class ${concept.class}`,
      chapter: concept.chapter_name,
    });
  }

  const tree = useMemo(
    () => buildTree(data as Concept[]),
    []
  );

  const conceptMap = useMemo(() => {
    const map: any = {};

    (data as Concept[]).forEach((item) => {
      map[item.concept_name] = item;
    });

    return map;
  }, []);

  const graphData = useMemo(() => {
    if (!selected) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const nodes: any[] = [];
    const edges: any[] = [];

    // CENTER NODE

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

          if (!item?.concept_name) {
            return;
          }

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

            source: item.concept_name,

            target: selected.concept_name,

            animated: true,
          });
        }
      );
    }

    // FREQUENTLY CONFUSED WITH

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

          if (!item?.concept_name) {
            return;
          }

          const nodeId =
            `fc-${item.concept_name}`;

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

            source: selected.concept_name,

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

      <div className="w-[360px] bg-white border-r overflow-y-auto p-4">

        <h1 className="text-2xl font-bold mb-6">
          Science Explorer
        </h1>

        {Object.entries(tree).map(
          ([subject, classes]: any) => (

            <details
              key={subject}
              open={
                expandedPath.subject ===
                  subject ||
                expandedPath.subject === ""
              }
              className="mb-4"
            >

              <summary className="cursor-pointer text-lg font-bold">
                {subject}
              </summary>

              <div className="ml-4 mt-2">

                {Object.entries(classes).map(
                  (
                    [className, chapters]: any
                  ) => (

                    <details
                      key={className}
                      open={
                        expandedPath.className ===
                        className
                      }
                      className="mb-3"
                    >

                      <summary className="cursor-pointer font-semibold">
                        {className}
                      </summary>

                      <div className="ml-4 mt-2">

                        {Object.entries(chapters).map(
                          (
                            [chapter, content]: any
                          ) => (

                            <details
                              key={chapter}
                              open={
                                expandedPath.chapter ===
                                chapter
                              }
                              className="mb-3"
                            >

                              <summary className="cursor-pointer text-blue-700">
                                {chapter}
                              </summary>

                              <div className="ml-4 mt-2 space-y-3">

                                {/* MAIN CONCEPTS */}

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

                                      const subtopics =
                                        (
                                          data as Concept[]
                                        ).filter(
                                          (
                                            x
                                          ) =>
                                            x.parent_concept_name ===
                                            concept.concept_name
                                        );

                                      return (

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

                                          {/* SUBTOPICS */}

                                          {subtopics.length >
                                            0 && (

                                            <div className="ml-4 mt-1 space-y-1">

                                              {subtopics.map(
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

                                {/* ADDITIONAL INFORMATION */}

                                {content.concepts.filter(
                                  (
                                    concept: any
                                  ) =>
                                    !concept.parent_concept_name &&
                                    !concept.is_main_topic
                                ).length > 0 && (

                                  <details className="mt-4">

                                    <summary className="cursor-pointer text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                      Additional
                                      Information
                                    </summary>

                                    <div className="ml-4 mt-2 space-y-1">

                                      {content.concepts
                                        .filter(
                                          (
                                            concept: any
                                          ) =>
                                            !concept.parent_concept_name &&
                                            !concept.is_main_topic
                                        )
                                        .map(
                                          (
                                            concept: any
                                          ) => (

                                            <button
                                              key={
                                                concept.concept_name
                                              }
                                              onClick={() =>
                                                selectConcept(
                                                  concept
                                                )
                                              }
                                              className={`block text-left text-sm px-2 py-1 rounded-lg hover:text-blue-500 ${
                                                selected?.concept_name ===
                                                concept.concept_name
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              •{" "}
                                              {
                                                concept.concept_name
                                              }
                                            </button>
                                          )
                                        )}

                                    </div>

                                  </details>

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
                  {selected.concept_name}
                </h1>

                {selected.difficulty_level && (

                  <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
                    {
                      selected.difficulty_level
                    }
                  </span>

                )}

              </div>

              <div className="text-gray-500">
                {selected.subject} • Class{" "}
                {selected.class}
              </div>

              <div className="text-gray-500">
                {selected.chapter_name}
              </div>

            </div>

            {/* SUMMARY */}

            <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

              <h2 className="text-2xl font-semibold mb-4">
                Summary
              </h2>

              <p className="text-lg leading-8 text-gray-700">
                {selected.summary ||
                  "No summary available"}
              </p>

            </div>

            {/* KEY TERMS */}

            {Array.isArray(
              selected.key_terms
            ) &&
              selected.key_terms.length >
                0 && (

                <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

                  <h2 className="text-2xl font-semibold mb-4">
                    Key Terms
                  </h2>

                  <div className="flex flex-wrap gap-3">

                    {selected.key_terms.map(
                      (
                        term: string,
                        idx: number
                      ) => (

                        <span
                          key={idx}
                          className="bg-gray-100 px-4 py-2 rounded-xl"
                        >
                          {term}
                        </span>
                      )
                    )}

                  </div>

                </div>
              )}

            {/* BUILDS UPON */}

            {Array.isArray(
              selected.builds_upon
            ) &&
              selected.builds_upon.length >
                0 && (

                <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

                  <h2 className="text-2xl font-semibold mb-4">
                    Builds Upon
                  </h2>

                  <div className="flex flex-wrap gap-3">

                    {selected.builds_upon.map(
                      (
                        item: RelatedConcept,
                        idx: number
                      ) => {

                        if (
                          !item?.concept_name
                        ) {
                          return null;
                        }

                        const relatedConcept =
                          conceptMap[
                            item.concept_name
                          ];

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (
                                relatedConcept
                              ) {
                                selectConcept(
                                  relatedConcept
                                );
                              }
                            }}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-xl transition"
                          >
                            {
                              item.concept_name
                            }
                          </button>
                        );
                      }
                    )}

                  </div>

                </div>
              )}

            {/* FREQUENTLY CONFUSED WITH */}

            {Array.isArray(
              selected.frequently_confused_with
            ) &&
              selected
                .frequently_confused_with
                .length > 0 && (

                <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

                  <h2 className="text-2xl font-semibold mb-4">
                    Frequently
                    Confused With
                  </h2>

                  <div className="flex flex-wrap gap-3">

                    {selected.frequently_confused_with.map(
                      (
                        item: RelatedConcept,
                        idx: number
                      ) => {

                        if (
                          !item?.concept_name
                        ) {
                          return null;
                        }

                        const relatedConcept =
                          conceptMap[
                            item.concept_name
                          ];

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (
                                relatedConcept
                              ) {
                                selectConcept(
                                  relatedConcept
                                );
                              }
                            }}
                            className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl transition"
                          >
                            {
                              item.concept_name
                            }
                          </button>
                        );
                      }
                    )}

                  </div>

                </div>
              )}

            {/* GRAPH */}

            <div className="bg-white rounded-3xl border shadow-sm p-8 mb-8">

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