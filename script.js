const timeZone = 'Europe/Paris';

// SleepBot export format
const sbHeaders = ['Date', 'Sleep Time', 'Wake Time', 'Hours', 'Note'];

// Sleep as Android import/export format https://sleep.urbandroid.org/documentation/developer-api/csv/
const saaHeaders = ['Id', 'Tz', 'From', 'To', 'Sched', 'Hours', 'Rating', 'Comment', 'Framerate', 'Snore', 'Noise', 'Cycles', 'DeepSleep', 'LenAdjust', 'Geo']; // + times

function isValid() {
  // is not empty
  // has appropriate headers
  // each line has appropriate number of columns
  // each line's column is of the expected type
  return true;
}

function parseSleepBot(input) {
  const lines = input.split('\n').filter(l => !!l.trim());
  const [rawHeaders, ...rawRows] = lines;
  const headers = rawHeaders.split(',').map(h => h.trim());
  const rows = rawRows.map(row =>
    row.split(',').reduce((acc, item, i) => {
      acc[sbHeaders[i]] = item.trim();
      return acc;
    }, {})
  );
  return [headers, rows];
}

function formatSADate(day, month, year, hours, minutes) {
  hours = hours[0] === '0' ? hours.slice(1) : hours;
  return `${day}. ${month}. ${year} ${hours}:${minutes}`;
}

function parseDate(row, isFromDate) {
  const date = new Date(row['Date']);
  const time = isFromDate ? row['Sleep Time'] : row['Wake Time'];
  const [hours, minutes] = time.split(':');

  if (isFromDate) {
    const isPreviousDay = parseInt(hours) >= 12;
    if (isPreviousDay) {
      date.setDate(date.getDate() - 1);
    }
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return formatSADate(day, month, year, hours, minutes);
}

function convert(headers, rows) {
  const result = rows.map(row => {
    const date = new Date(row['Date']);
    date.setHours(row['Sleep Time'].split(':')[0]);
    date.setMinutes(row['Sleep Time'].split(':')[1]);
    const timestamp = date.getTime();
    const fromDate = parseDate(row, true);
    const toDate = parseDate(row);

    const [hoursSlept, minutesSlept] = row['Hours'].split('.');
    const hours = hoursSlept + '.' + minutesSlept.padEnd(3, '0');

    return {
      'Id': timestamp,
      'Tz': timeZone,
      'From': fromDate,
      'To': toDate,
      'Sched': toDate,
      'Hours': hours,
      'Rating': '0.0',
      'Comment': row['Note'],
      'Framerate': '10005',
      'Snore': '-1',
      'Noise': '-1.0',
      'Cycles': '-1',
      'DeepSleep': '-2.0',
      'LenAdjust': '0',
      'Geo': '',
      'Time': toDate.split(' ')[3]
    };
  });
  return result;
}

function sleepBotToSleepAsAndroid(rawInput) {
  if (!isValid(rawInput)) {
    console.log('invalid');
  }
  const [headers, rows] = parseSleepBot(rawInput);
  let result = convert(headers, rows);

  const saaOutputHeaders = saaHeaders.join(',');
  result = result.reduce((acc, row) => {
    acc.push(saaOutputHeaders + ',"' + row['Time'] + '"');
    acc.push(saaHeaders.map(h => `"${row[h]}"`).join(',') + ',"0.0"');
    return acc;
  }, []);
  result = result.join('\r\n');
  return result;
}

function getExportCSVUri(sleepBotData) {
  const sleepAsAndroidData = sleepBotToSleepAsAndroid(sleepBotData);
  return "data:text/csv;charset=utf-8," + encodeURI(sleepAsAndroidData);
}
