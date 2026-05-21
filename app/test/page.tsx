"use client";

export default function TestPage() {

  async function testQuiz() {

    const response = await fetch(
      "/api/generate-quiz",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          subject: "Biology",

          classLevel: 9,

          chapter:
            "Cell: The Building Block of Life",

          concepts: [
            {
              concept_name:
                "Cell Membrane",

              summary:
                "Controls movement of substances into and out of cell.",
            },

            {
              concept_name:
                "Nucleus",

              summary:
                "Controls cell activities and contains genetic material.",
            },

            {
              concept_name:
                "Mitochondria",

              summary:
                "Produces energy for the cell.",
            },
          ],
        }),
      }
    );

    const data =
      await response.json();

    console.log(data);

    alert(
      JSON.stringify(
        data,
        null,
        2
      )
    );
  }

  return (

    <div className="p-10">

      <button
        onClick={testQuiz}
        className="bg-blue-600 text-white px-6 py-4 rounded-2xl"
      >
        Generate Quiz
      </button>

    </div>
  );
}
