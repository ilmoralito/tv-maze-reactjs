import React from 'react';
import './App.css';
import Highlight from 'react-highlighter';
import ReactCountryFlag from 'react-country-flag';

const API = 'https://api.tvmaze.com';

async function fetcher(endpoint) {
    const response = await fetch(`${API}${endpoint}`);

    return await response.json();
}

function App() {
    const [show, setShow] = React.useState({});
    const [episodes, setEpisodes] = React.useState([]);
    const [shows, setShows] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasErrors, setHasErrors] = React.useState(false);

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
        const endpoints = [`/shows/${id}`, `/shows/${id}/episodes`];
        const promises = endpoints.map((endpoint) => fetcher(endpoint));

        Promise.all(promises)
            .then((data) => {
                const [show, episodes] = data;

                setShow(show);
                setEpisodes(episodes);
            })
            .catch((error) => {
                console.error(error.message);
            });
    }

    return (
        <>
            <div>
                <Form onSubmit={submitHandler} />
                {hasErrors ? <HasErrors /> : null}
                {isLoading ? <IsLoading /> : <Shows shows={shows} onClick={clickHandler} />}
            </div>
            <ShowDetail show={show} />
            <ShowEpisodes episodes={episodes} />
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

function ShowDetail({ show }) {
    return (
        <div>
            {Object.keys(show).length > 0 && (
                <>
                    <h1>{show.name}</h1>
                    <img src={show.image && show.image.medium} alt={show.name} />
                    <p dangerouslySetInnerHTML={createMarkup(show.summary)} />
                    <table>
                        <tbody>
                            <tr>
                                <td>Premiered</td>
                                <td>{show.premiered}</td>
                            </tr>
                            <tr>
                                <td>Network</td>
                                <td>
                                    {show?.network?.name}{' '}
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
                                <td>{show.genres.join(', ')}</td>
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
                </>
            )}
        </div>
    );
}

function ShowEpisodes({ episodes }) {
    const [seasons, setSeasons] = React.useState([]);
    const [filter, setFilter] = React.useState('');

    React.useEffect(() => {
        setSeasons(groupEposiodesBySeason(episodes));
    }, [episodes]);

    return (
        <div>
            {!seasons.length ? (
                <div />
            ) : (
                <>
                    <input
                        placeholder="Filter by episode name"
                        onChange={(event) => setFilter(event.target.value)}
                        style={{ marginBottom: '10px' }}
                        value={filter}
                    />
                    {seasons
                        .filter((season) => {
                            const [, episodes] = season;

                            return episodes.some((episode) =>
                                episode.name.toLowerCase().includes(filter.toLowerCase())
                            );
                        })
                        .map(([number, episodes]) => {
                            return <Season key={number} number={number} episodes={episodes} filter={filter} />;
                        })}
                </>
            )}
        </div>
    );
}

function Form({ onSubmit }) {
    const [query, setQuery] = React.useState('');

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
                <input name="query" id="query" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="group">
                <button type="submit">Send</button>
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
    const externalList = Object.entries(externals).filter((external) => external[1]);

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
            previousValue[currentValue.season] = previousValue[currentValue.season].concat(currentValue);
        }

        return previousValue;
    }, {});

    return Object.entries(result);
}

export default App;
