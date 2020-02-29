const eventstream = require('event-stream');

function packify( input ) {
  var script = input,
    len,
    i,
    chunk,
    chunk_size,
    re,
    matches,
    savings,

    potential,
    potentials = {},
    potentials_arr = [],

    map = '',
    char_code,
    char,
    output;

  // Single quotes need to be escaped, so use double-quotes in your input
  // source whenever possible.
  script = script.replace( /'/g, "\\'" );

  // Replace any non-space whitespace with spaces (shouldn't be necessary).
  script = script.replace( /\s+/g, ' ' );

  // Return number of chars saved by replacing `count` occurences of `string`.
  function get_savings( string, count ) {
    return ( string.length - 1 ) * ( count - 1 ) - 2;
  };

  // Just trying to keep things DRY here... Let's match some patterns!
  function get_re_match( pattern, text ) {
    var re = RegExp( pattern.replace( /(\W)/g, '\\$1' ), 'g' );
    return [
      text.match( re ) || [],
      re
    ];
  };

  // Look for recurring patterns between 2 and 20 characters in length (could
  // have been between 2 and len / 2, but that gets REALLY slow).
  for ( chunk_size = 2, len = script.length; chunk_size <= 20; chunk_size++ ) {

    // Start at the beginning of the input string, go to the end.
    for ( i = 0; i < len - chunk_size; i++ ) {

      // Grab the "chunk" at the current position.
      chunk = script.substr( i, chunk_size );

      if ( !potentials[ chunk ] ) {
        // Find the number of chunk matches in the input script.
        matches = get_re_match( chunk, script )[0];

        // If any matches, save this chunk as a potential pattern. By using an
        // object instead of an array, we don't have to worry about uniquing
        // the array as new potentials will just overwrite previous potentials.
        if ( get_savings( chunk, matches.length ) >= 0 ) {
          potentials[ chunk ] = matches.length;
        }
      }
    }
  }

  // Since we'll need to sort the potentials, create an array from the object.
  for ( i in potentials ) {
    potentials.hasOwnProperty( i )
      && potentials_arr.push({ pattern: i, count: potentials[ i ] });
  }

  // Potentials get sorted first by byte savings, then by # of occurrences
  // (favoring smaller count, longer patterns), then lexicographically.
  function sort_potentials( a, b ) {
    return get_savings( b.pattern, b.count ) - get_savings( a.pattern, a.count )
      || a.count - b.count
      || ( a.pattern < b.pattern ? -1 : a.pattern > b.pattern ? 1 : 0 );
  };

  // Loop over all the potential patterns, unless we run out of replacement
  // chars first. Dealing with 7-bit ASCII, valid replacement chars are 1-31
  // & 127 (excluding ASCII 10 & 13).
  for ( char_code = 0; potentials_arr.length && char_code < 127; ) {

    // Re-calculate match counts.
    for ( i = 0, len = potentials_arr.length; i < len; i++ ) {
      potential = potentials_arr[i];
      matches = get_re_match( potential.pattern, script )[0];
      potential.count = matches.length;
    }

    // Sort the array of potentials such that replacements that will yield the
    // highest byte savings come first.
    potentials_arr.sort( sort_potentials );

    // Get the current best potential replacement.
    potential = potentials_arr.shift();

    // Find all chunk matches in the input string.
    chunk = potential.pattern;
    matches = get_re_match( chunk, script );
    re = matches[1];
    matches = matches[0];

    // Ensure that replacing this potential pattern still actually saves bytes.
    savings = get_savings( chunk, matches.length );
    if ( savings >= 0 ) {

      // Increment the current replacement character.
      char_code = ++char_code == 10 ? 11
        : char_code == 13 ? 14
        : char_code == 32 ? 127
        : char_code;

      // Get the replacement char.
      char = String.fromCharCode( char_code );

      //console.log( char_code, char, matches.length, chunk, savings );

      // Replace the pattern with the replacement character.
      script = script.replace( re, char );

      // Add the char + pattern combo into the map of replacements.
      map += char + chunk;
    }
  }

  // For each group of 1 low ASCII char / 1+ regular ASCII chars combo in the
  // map string, replace the low ASCII char in the script string with the
  // remaining regular ASCII chars, then eval the script string. Using with in
  // this manner ensures that the temporary _ var won't be leaked.
  output = ""
    + "with({_:'" + script + "'})"
    +   "'" + map + "'.replace(/.([ -~]+)/g,function(x,y){"
    +     "_=_.replace(RegExp(x[0],'g'),y)"
    +   "}),"
    +   "eval(_)";

  if ( eval( output.replace( 'eval(_)', '_' ) ) === input ) {
    // If the output *actually* evals to the input string, packing was
    // successful. Log some useful stats and return the output.
    /*console.log( 'Success, ' + input.length + 'b -> ' + output.length
      + 'b (' + ( input.length - output.length ) + 'b or '
      + ( ~~( ( 1 - output.length / input.length ) * 10000 ) / 100 )
      + '% savings)' );*/

    return output;

  } else {
    // Otherwise, exit with an error.
    console.log('Error! packify compression result does not evaluate to same input');
    return output;
  }
};


module.exports = function (opt) {
  function gulpPackify(file) {
    if (file.isNull()) return this.emit('data', file);
    if (file.isStream()) return this.emit('error', new Error("Streaming not supported"));
    var str = file.contents.toString('utf8');

    const before = str.length;
    const result = packify(str);
    const after = result.length;

    const ratio = Math.round(after / before * 100);

    if (ratio < 100) {
      console.log(`packify: decreased JavaScript by ${100 - ratio}% (from ${before} to ${after})`);
      file.contents = new Buffer.from(result);
    } else {
      console.error(`packify: unable to shrink JavaScript, increased to ${ratio}%`)
      file.contents = new Buffer.from(str);
    }

    this.emit('data', file);
  }

  return eventstream.through(gulpPackify);
};