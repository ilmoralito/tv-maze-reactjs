import React, { useState, useEffect } from "react";
import "./App.css";
import Highlight from "react-highlighter";
import ReactCountryFlag from "react-country-flag";

const API = "https://api.tvmaze.com";

async function fetcher(endpoint) {
  const response = await fetch(`${API}${endpoint}`);

  return await response.json();
}

function App() {
  const [show, setShow] = useState({});
  const [episodes, setEpisodes] = useState([]);
  const [cast, setCast] = useState(null);
  const [shows, setShows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [hasSummaryLoadingErrors, setHasSummaryLoadingErrors] = useState(false);

  function submitHandler(query) {
    setIsLoading(true);
    setHasErrors(false);

    fetcher(`/search/shows?q=${query}`)
      .then((shows) => {
        const showList = shows.map((entry) => entry.show);

        setIsLoading(false);

        setShows(showList);
      })
      .catch((error) => {
        setHasErrors(true);
        setIsLoading(false);

        console.error(error.message);
      });
  }

  function clickHandler(id) {
    setIsSummaryLoading(true);
    setHasSummaryLoadingErrors(false);

    if (hasLocalStorage() && existInLocalStorage(id)) {
      const [show, episodes, cast] = fetchFromLocalStorage(id);

      setShow(show);
      setEpisodes(episodes);
      setCast(cast);
      setIsSummaryLoading(false);

      return false;
    }

    const endpoints = [
      `/shows/${id}`,
      `/shows/${id}/episodes`,
      `/shows/${id}/cast`,
    ];

    const promises = endpoints.map((endpoint) => fetcher(endpoint));

    Promise.all(promises)
      .then((data) => {
        const [show, episodes, cast] = data;

        setIsSummaryLoading(false);

        syncLocalStorage({ id, data });

        setShow(show);
        setEpisodes(episodes);
        setCast(cast);
      })
      .catch((error) => {
        setHasSummaryLoadingErrors(true);
        setIsSummaryLoading(false);

        console.error(error.message);
      });
  }

  return (
    <>
      <div>
        <Form onSubmit={submitHandler} />
        {hasErrors ? <HasErrors /> : null}
        {isLoading ? (
          <IsLoading />
        ) : (
          <Shows shows={shows} onClick={clickHandler} />
        )}
      </div>
      <ShowDetail
        show={show}
        isSummaryLoading={isSummaryLoading}
        hasSummaryLoadingErrors={hasSummaryLoadingErrors}
      />
      <ShowSummary
        episodes={episodes}
        cast={cast}
        isSummaryLoading={isSummaryLoading}
        hasSummaryLoadingErrors={hasSummaryLoadingErrors}
      />
    </>
  );
}

function Shows({ shows, onClick }) {
  return (
    <div>
      <ShowList shows={shows} onClick={onClick} />
    </div>
  );
}

function ShowDetail({ show, isSummaryLoading, hasSummaryLoadingErrors }) {
  return (
    <div>
      {hasSummaryLoadingErrors ? <HasErrors /> : null}
      {isSummaryLoading ? (
        <IsLoading />
      ) : (
        <>
          {Object.keys(show).length > 0 && (
            <>
              <h1>{show.name}</h1>
              <img src={show.image && show.image.medium} alt={show.name} />
              <p dangerouslySetInnerHTML={createMarkup(show.summary)} />
              <ShowTable show={show} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function ShowTable({ show }) {
  return (
    <table>
      <tbody>
        <tr>
          <td>Premiered</td>
          <td>{show.premiered}</td>
        </tr>
        <tr>
          <td>Network</td>
          <td>
            {show?.network?.name}{" "}
            <ReactCountryFlag countryCode={show?.network?.country?.code} />
          </td>
        </tr>
        <tr>
          <td>Type</td>
          <td>{show.type}</td>
        </tr>
        <tr>
          <td>Language</td>
          <td>{show.language}</td>
        </tr>
        <tr>
          <td>Genres</td>
          <td>{show.genres.join(", ")}</td>
        </tr>
        <tr>
          <td>Status</td>
          <td>{show.status}</td>
        </tr>
        <tr>
          <td>Runtime</td>
          <td>{show.runtime}</td>
        </tr>
        <tr>
          <td>Site</td>
          <td>
            {show.officialSite && (
              <a href={show.officialSite} alt={show.name}>
                {show.name}
              </a>
            )}
          </td>
        </tr>
        <tr>
          <td>Externals</td>
          <td>
            <Externals externals={show.externals} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ShowSummary({
  episodes,
  cast: castList,
  isSummaryLoading,
  hasSummaryLoadingErrors,
}) {
  const [seasons, setSeasons] = useState([]);
  const [cast, setCast] = useState([]);
  const [filter, setFilter] = useState("");
  const [isEpisodesOpen, setIsEpisodesOpen] = useState(true);
  const [isCastOpen, setIsCastOpen] = useState(false);

  useEffect(() => {
    setSeasons(groupEposiodesBySeason(episodes));
  }, [episodes]);

  useEffect(() => {
    setCast(castList);
  }, [castList]);

  function clickHandler(tab) {
    if (tab === "episodes") {
      setIsEpisodesOpen(true);
      setIsCastOpen(false);
    } else {
      setIsEpisodesOpen(false);
      setIsCastOpen(true);
    }
  }

  return (
    <div>
      {hasSummaryLoadingErrors ? <HasErrors /> : null}
      {isSummaryLoading ? (
        <IsLoading />
      ) : (
        <>
          {!seasons.length ? (
            <div />
          ) : (
            <>
              <Tabs
                isEpisodesOpen={isEpisodesOpen}
                isCastOpen={isCastOpen}
                onClick={clickHandler}
              />
              {isEpisodesOpen ? (
                <>
                  <input
                    placeholder="Filter by episode name"
                    onChange={(event) => setFilter(event.target.value)}
                    style={{ marginBottom: "10px" }}
                    value={filter}
                  />
                  {seasons
                    .filter((season) => {
                      const [, episodes] = season;

                      return episodes.some((episode) =>
                        episode.name
                          .toLowerCase()
                          .includes(filter.toLowerCase())
                      );
                    })
                    .map(([number, episodes]) => {
                      return (
                        <Season
                          key={number}
                          number={number}
                          episodes={episodes}
                          filter={filter}
                        />
                      );
                    })}
                </>
              ) : (
                <Cast cast={cast} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Tabs({ isEpisodesOpen, isCastOpen, onClick }) {
  return (
    <ul className="tabs">
      <li>
        <a
          href="!#"
          style={{ textDecoration: isEpisodesOpen ? "underline" : "none" }}
          onClick={(event) => {
            event.preventDefault();

            onClick("episodes");
          }}
        >
          Episodes
        </a>
      </li>
      <li>
        <a
          href="!#"
          style={{ textDecoration: isCastOpen ? "underline" : "none" }}
          onClick={(event) => {
            event.preventDefault();

            onClick("cast");
          }}
        >
          Cast
        </a>
      </li>
    </ul>
  );
}

function Form({ onSubmit }) {
  const [query, setQuery] = useState("");

  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();

        onSubmit(query);
      }}
    >
      <div className="group">
        <label htmlFor="query">Query for tv show name</label>
        <input
          name="query"
          id="query"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>
      <div className="group">
        <button type="submit" disabled={!query}>
          Send
        </button>
      </div>
    </form>
  );
}

function ShowList({ shows, onClick }) {
  return (
    <div>
      {shows.map((show) => (
        <Show key={show.id} show={show} onClick={onClick} />
      ))}
    </div>
  );
}

function Show({ show, onClick }) {
  return (
    <li>
      <a
        href="!#"
        onClick={(event) => {
          event.preventDefault();

          onClick(show.id);
        }}
      >
        {show.name}
      </a>
    </li>
  );
}

function Externals({ externals }) {
  const externalList = Object.entries(externals).filter(
    (external) => external[1]
  );

  return (
    <ul style={{ margin: 0 }}>
      {externalList.map(([external, id]) => (
        <li key={id}>
          {external} - {id}
        </li>
      ))}
    </ul>
  );
}

function Season({ number, episodes, filter }) {
  return (
    <details open={filter.length}>
      <summary>{number}</summary>
      <p>
        <small>{episodes.length} episodes</small>
      </p>
      {episodes.map((episode) => (
        <Episode key={episode.id} episode={episode} filter={filter} />
      ))}
    </details>
  );
}

function Episode({ episode, filter }) {
  return (
    <details>
      <summary>
        <Highlight search={filter}>{episode.name}</Highlight>
      </summary>
      {episode.image && <img src={episode.image.medium} alt={episode.name} />}
      <p dangerouslySetInnerHTML={createMarkup(episode.summary)} />
    </details>
  );
}

function Cast({ cast }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {cast.map((entry) => {
        const { person, character } = entry;

        return (
          <figure key={entry.person.id}>
            <img src={character?.image?.medium} alt={character.name} />
            <figcaption>
              <p style={{ margin: "10px 0 0 0" }}>
                <small>{person.name} as</small>
              </p>
              <p style={{ margin: 0 }}>
                <small>
                  <strong>{character.name}</strong>
                </small>
              </p>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function IsLoading() {
  return <p>Is loading...</p>;
}

function HasErrors() {
  return <p>An error has occurred...</p>;
}

function createMarkup(summary) {
  return { __html: summary };
}

function groupEposiodesBySeason(episodes) {
  const result = episodes.reduce((previousValue, currentValue) => {
    if (!previousValue[currentValue.season]) {
      previousValue[currentValue.season] = [currentValue];
    } else {
      previousValue[currentValue.season] = previousValue[
        currentValue.season
      ].concat(currentValue);
    }

    return previousValue;
  }, {});

  return Object.entries(result);
}

function syncLocalStorage({ id, data }) {
  let storage = localStorage.maze ? JSON.parse(localStorage.maze) : {};

  storage[id] = data;

  localStorage.maze = JSON.stringify(storage);
}

function fetchFromLocalStorage(id) {
  return JSON.parse(localStorage.maze)[id];
}

function hasLocalStorage() {
  return localStorage.maze !== undefined;
}

function existInLocalStorage(id) {
  return id in JSON.parse(localStorage.maze);
}

export default App;
