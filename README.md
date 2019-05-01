# L1 Programming Node API

This project contains a JavaScript REST API (server) and a single-page
application (SPA) that can be used to access it (client).

The API uses data involving video games (by default, the games and the platforms that play them) from https://api-docs.igdb.com/,
with a local backup in case this external API is unavailable.

A cloud-deployed version of the server, including the SPA, is available at https://prog-api.glitch.me/.

## Client-side documentation

For each entity type, the website allows the user to:
- Display a list of all instances (names and links only)
- Enter a search query and only display the list of instances containing it
- Display a single instance with details (accessed from the search or from another instance that references it)
- Create an account, or use a Google account, and login
- When logged in, submit a new instance by filling out fields in a sidebar

The user can choose which entity to send or receive using a dropdown in the navbar.

The webpage is responsive; for displays less than 768px wide the navbar will display as a collapsible vertical menu. 


## Server-side documentation

The server uses several routes, each of which is compatible with any stored entity type. Responses to all routes are in JSON form.

Parameters are specified in the URL query: `url_root/route?param1=value1&param2=value2,value3`
- The query begins with a question mark: `?`
- Each parameter is separated by an ampersand: `&`
- Each parameter's value is assigned by an equals sign: `=`
- If a parameter can accept multiple values (equivalent to an array), each is separated by a comma: `,` 

Defined entities are `games` and `platforms`. If no entity is specified, `games` will be chosen by default (except in GET /getFieldInfo and POST /add).

### GET /search
Returns a list of objects. Each object represents one instance of the entity type.

Parameters: `entity`, `key`
- `entity`: Type of entity (`games`, `platforms`). If not recognised or specified, `games` will be chosen.
- `key`: String to filter by. Only values where attribute `name` contains `key` will be returned. If unspecified, no filter will be applied and all instances will be returned.

Output: Array of objects with fields `id`,`name`
 - `id`: index of instance in its list
 - `name`: name of instance as displayed to the user

### GET /entry
Returns details of the specified entry.

Parameters: `entity`,`id`
- `entity`: Type of entity (`games`, `platforms`). If not recognised or specified, `games` will be chosen.
- `id`: Index of instance in its list. If not recognised or specified, server returns 404 error.

Output: Object representing a single instance, with multiple attribute fields (these can vary).
Defined fields can contain a string or an array containing the corresponding data.

- Includes `name`
- Potentially includes `summary` (not entity-specific)
- Potentially includes `platforms`, `genres`, `age_rating`, `cover`, `storyline`, `abbreviation`, `alternative_name` (entity-specific)

### GET /getFieldInfo
Retrieves server's metadata about specified fields, for use in displaying or processing.
Parameters: `entity`, `components`
- `entity`: Entity type. If not specified, server will return a list of supported entity types
- `components`: Desired attribute(s), comma-separated. If left empty, gets all attributes of each field.

Output: List of objects containing attributes for each fields, potentially including:
- `id`: Always included. Name of field as referred to in scripts and id of corresponding HTML elements.
- `label`: Name of field as it should be displayed on the page or otherwise shown to the user.
- `html`: HTML template string for displaying element on screen (e.g. `<h1>` for names, `<img>` for images).
  - To use, replace the placeholder `$` in this string with your content.
- `isEntity`: Boolean variable determining whether this field is an entity type, for setting relationships between entities.
- `required`: Boolean variable determining whether undefined data must be given a default value ("None Set") instead of remaining undefined.
Mostly used server-side.  
- `query`: String to inject into the query sent to the external API.
Only defined for independent entities (e.g. `games`); derived entities (e.g. `platforms` are worked out in-program instead. Mostly used server-side.

For reference, here is a sample field object associated with the `games` entity type: 

`{id: "cover", query: "cover.*", label: "Image URL", html: "<img src=$><br>", required: false, isEntity: false}`

###POST /add
Requires authorisation. Currently can only be performed from http://127.0.0.1:8090 and  https://prog-api.glitch.me/,
as allowed URLs must be defined individually by the holder of the auth0 account that supplies the authentication service used.

Parameters are not URL encoded; they are passed into the fetch() call.
Fetch request format:
```javascript
fetch(`${root_url}/add`,{
    method: "POST",
    headers:{
    "Content-Type": "application/json",
    Authorization: "Bearer " + accessToken,
    entity: entity
    },
    body: JSON.stringify(formData)
});
```
Variables:
- `root_url`: Server URL
- `accessToken`: Access token, parsed from hash provided by auth0 login.
Credentials for setting this up will depend on what authentication method
is used and on who holds the account to this method.
- `entity`: Type of entity being posted (`"games"`, `"platforms"`)
- `formData`: Array of field objects, each containing attributes `id`
(see /getFieldInfo) and `value` (the actual data corresponding to the field).