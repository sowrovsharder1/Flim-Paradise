document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("top10-form");
  const status = document.getElementById("top10-status");

  if (!form) return;

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = "form-status";

    if (type) {
      status.classList.add(type);
    }
  }

  async function uploadPoster(file, rank) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("rank", String(rank));

    const response = await fetch("/api/top10/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || `Poster upload failed for rank ${rank}.`
      );
    }

    return data;
  }

  async function saveEntry(entry) {
    const response = await fetch("/api/top10", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(entry)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || `Failed to save rank ${entry.rank}.`
      );
    }

    return data;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const entries = [];

      for (let rank = 1; rank <= 10; rank++) {
        const titleInput =
          document.getElementById(`top10-title-${rank}`);

        const yearInput =
          document.getElementById(`top10-year-${rank}`);

        const languageInput =
          document.getElementById(`top10-language-${rank}`);

        const descriptionInput =
          document.getElementById(
            `top10-description-${rank}`
          );

        const posterInput =
          document.getElementById(`top10-poster-${rank}`);

        const title =
          titleInput?.value.trim() || "";

        const releaseYear =
          yearInput?.value.trim() || "";

        const language =
          languageInput?.value.trim() || "";

        const shortDescription =
          descriptionInput?.value.trim() || "";

        const posterFile =
          posterInput?.files?.[0] || null;

        const emptyEntry =
          !title &&
          !releaseYear &&
          !language &&
          !shortDescription &&
          !posterFile;

        if (emptyEntry) {
          continue;
        }

        if (!title) {
          setStatus(
            `Rank ${rank}: Movie title is required.`,
            "error"
          );
          return;
        }

        if (!language) {
          setStatus(
            `Rank ${rank}: Language is required.`,
            "error"
          );
          return;
        }

        entries.push({
          rank,
          title,
          release_year: releaseYear,
          language,
          short_description: shortDescription,
          posterFile
        });
      }

      if (entries.length === 0) {
        setStatus(
          "Please add at least one Top 10 movie.",
          "error"
        );
        return;
      }

      setStatus("Saving Top 10...");

      for (const entry of entries) {
        let posterKey = "";
        let posterUrl = "";

        if (entry.posterFile) {
          setStatus(
            `Uploading poster for Rank ${entry.rank}...`
          );

          const uploadResult = await uploadPoster(
            entry.posterFile,
            entry.rank
          );

          posterKey = uploadResult.key || "";
          posterUrl = uploadResult.url || "";
        }

        setStatus(
          `Saving Rank ${entry.rank}...`
        );

        await saveEntry({
          rank: entry.rank,
          title: entry.title,
          release_year: entry.release_year,
          language: entry.language,
          short_description: entry.short_description,
          poster_key: posterKey,
          poster_url: posterUrl
        });
      }

      setStatus(
        "Top 10 saved successfully.",
        "success"
      );

    } catch (error) {
      console.error(error);

      setStatus(
        error.message ||
          "Something went wrong while saving.",
        "error"
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
});
