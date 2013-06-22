/**
	Some terms:
		downEvents : A member is reporting another member to be down
		upEvents: A member reporting another member to be up
	
	About the script:
		The script exits with 0, 1, 2 output which denotes OK, WARNING, CRITICAL
		For each member, for each node of cluster, total upEvents and downEvents are calculated
		This script is meant for notifying all the up and events reported by each of the server about other members
		The script can be modified to serve more purpose, for eg., only notify when there is an issue i.e. (downEvents > upEvents)
		Run the script every 5 min, which can be changed in the value 'fiveMinsAgo', on all the replica nodes

	How to run:
		mongo --host <hostname> --port <port-no> -u<username> -p<password> <rs_flip_watcher.js>

	Output:
		OUTPUT: 2
		{ "<host-name>" : { "upEvents" : 2, "downEvents" : 2 } }	// no need to worry, but for information, two flips happened
*/

var WARNING_THRESHOLD = 1;
var CRITICAL_THRESHOLD = WARNING_THRESHOLD;

var now = new Date();
var currentYear = now.getFullYear();
var fiveMinsAgo = new Date(now.getTime() - (5 * 60 * 1000));
var oneMinsAfter = new Date(now.getTime() + (1 * 60 * 1000));
var totalDownEvents = 0;
var totalUpEvents = 0;
var memberEvents = {};

var UP_EVENT_REGEX = /.*replSet\smember\s(.*):.*\sis\sup$/;
var DOWN_EVENT_REGEX = /.*replSet\smember\s(.*):.*\sis\snow\sin\sstate\sDOWN$/;

var logLines = db.adminCommand({getLog: "rs"});
logLines.log.forEach(function(l) {
    var sl = l.split(' [');
    var date = sl[0] + ' GMT';

    var nth = 3;
    var idx = -2;
    while (nth-- && idx != -1) {
        idx = date.indexOf(' ', idx + 1);
    }

    var parsedDate = new Date([date.slice(0, idx), ' ' + currentYear, date.slice(idx)].join(''));
    if (parsedDate > fiveMinsAgo && parsedDate < oneMinsAfter) {
        var match = UP_EVENT_REGEX.exec(l);
        if (match) {
            var memberName = match[1];
            totalUpEvents++;
            if (!memberEvents[memberName]) memberEvents[memberName] = {upEvents: 0, downEvents: 0};
            memberEvents[memberName].upEvents++;
        }
        var match = DOWN_EVENT_REGEX.exec(l);
        if (match) {
            var memberName = match[1];
            totalDownEvents++;
            if (!memberEvents[memberName]) memberEvents[memberName] = {upEvents: 0, downEvents: 0};
            memberEvents[memberName].downEvents++;
        }
    }
});
var totalEvents = totalDownEvents + totalUpEvents;
var exitCode = totalEvents >= CRITICAL_THRESHOLD ? 2 : totalEvents >= WARNING_THRESHOLD ? 1 : 0;
var messageToPrint = memberEvents;
print('OUTPUT: ' + exitCode);
print(tojson(memberEvents));
