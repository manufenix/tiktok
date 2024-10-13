// This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
let backendUrl = "https://tiktok-chat-reader.zerody.one/";
let connection = new TikTokIOConnection(backendUrl);


let diamondsCount = 0;
let hostUserId = 0;
let endBattleDate = 0;


// These settings are defined by obs.html
if (!window.settings) window.settings = {};

if (window.settings.username) connect();

let max = window.settings.maxTime * 1000;


function connect() {
    let uniqueId = window.settings.username || $('#uniqueIdInput').val();
    if (uniqueId !== '') {

        $('#stateText').text('Conectando...');

        connection.connect(uniqueId, {
            enableExtendedGiftInfo: true
        }).then(state => {
            $('#stateText').text(``);

            // reset stats
            diamondsCount = 0;
            hostUserId = state.roomInfo.owner.id_str
            updateRoomStats();

        }).catch(errorMessage => {
            $('#stateText').text(errorMessage);

            // schedule next try if obs username set
            if (window.settings.username) {
                setTimeout(() => {
                    connect(window.settings.username);
                }, 30000);
            }
        })

    } else {
        alert('no username entered');
    }
}

// Prevent Cross site scripting (XSS)
function sanitize(text) {
    return text.toString().replace(/</g, '&lt;')
}

function updateRoomStats() {
    $('#roomStats').html(`Puntos ganados: <b>${diamondsCount.toLocaleString()}</b>`)
}


function isPendingStreak(data) {
    return data.giftType === 1 && !data.repeatEnd;
}

// Define a function that takes the array of participants and the streak id as parameters

function generateHTML(participants, streakId) {
    let html = "";
    let medals = ["🥇", "🥈", "🥉"];
    html += `<div data-streakid=${streakId}>`;
    for (let i = 0; i < participants.length; i++) {
        let name = participants[i].nickname;
        let medal = medals[i];
        html += `
	  <hr style="height:5pt; visibility:hidden;" />
      <font style="margin: auto;opacity: 0.9;height: 150px;width: 150px;-webkit-animation-name: whitePulse;-webkit-animation-duration: 2s;-webkit-animation-iteration-count: 1;-webkit-filter: drop-shadow(5px 5px 50px ${window.settings.bgColor});filter: drop-shadow(5px 5px 25px ${window.settings.bgColor})">${medal}</font>
      <span><b style="opacity: 0.7;border-radius: 10px;background:${window.settings.bgColor};color:${window.settings.fontColor};padding:5px 5px 5px 10px">${name}</b><span>
    `;
    }
    html += "</div>";
    return html;
}

// Function to cut a string with emojis
function cutStringWithEmojis(string, limit) {
    let normalCounter = 0;
    let emojiCounter = 0;
    let finalIndex = 0;
    for (let i = 0; i < string.length; i++) {
        let code = string.codePointAt(i);
        if (code > 65535) {
            emojiCounter++;
            i++;
        } else {
            normalCounter++;
        }
        let total = normalCounter + emojiCounter * 2;
        if (total >= limit) {
            finalIndex = i;
            break;
        }
    }
    let cutString = string.slice(0, finalIndex + 1);
    let withoutFinalEmojis = cutString.replace(
        /([\\u2700-\\u27BF]|\\uD83C[\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDFFF]|[\\u2011-\\u26FF]|\\uD83E[\\uDD10-\\uDDFF])+$/g,
        ""
    );
    return withoutFinalEmojis;
}



function shortenNames(participants, characters) {
    for (let i = 0; i < participants.length; i++) {
        let name = participants[i].nickname;
        if (name.length > characters) {
            participants[i].nickname = cutStringWithEmojis(name, characters);
        }
    }
}

function handleBattleArmy(element, container, max) {
    if (container.find('div').length > 200) {
        container.find('div').slice(0, 100).remove();
    }

    shortenNames(element.participants, 11);

    let streakId = element.hostUserId.toString();

    let html = generateHTML(element.participants, streakId);

    let existingStreakItem = container.find(`[data-streakid='${streakId}']`);

    if (!existingStreakItem.length) {
        container.append(html);
        setTimeout(() => {
            container.find('div')[0].remove();
        }, max * 2);
    }

    endBattleDate = Date.now()
    endBattleDate = endBattleDate + max * 2;

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 800);
}

/**
 * Add a new gift to the gift container
 */
function addGiftItem(data) {
    let container = $('.eventcontainer');

    let today = new Date();
    let dummy = today.getTime();

    let streakId = data.userId.toString() + '_' + data.giftId;
    let idTime = (isPendingStreak(data) ? streakId : '') + dummy;

    if (data.nickname.length > 12) {
        data.nickname = cutStringWithEmojis(data.nickname, 12);
    }

    let html = `
        <div data-streakid=${streakId}>
                    <table style="margin: auto;">
                        <tr>
                            <td><img style="margin: auto;opacity: 0.9;height: 770px;width: 770px;border-radius: 50%;-webkit-animation-name: whitePulse;-webkit-animation-duration: 2s;-webkit-animation-iteration-count: 1;-webkit-box-shadow: 5px 5px 100px ${window.settings.bgColor}" src="${data.profilePictureUrl}">
                            <img style="margin: auto;opacity: 0.9;height: 800px;width: 800px;-webkit-animation-name: whitePulse;-webkit-animation-duration: 2s;-webkit-animation-iteration-count: 1;-webkit-filter: drop-shadow(5px 5px 100px ${window.settings.bgColor});filter: drop-shadow(5px 5px 100px ${window.settings.bgColor})" src="${data.giftPictureUrl}"
                            </td>
                        </tr>
                    </table>
                    <span><b style="opacity: 0.7;border-radius: 10px;background:${window.settings.bgColor};color:${window.settings.fontColor};padding:5px 5px 5px 10px">${data.nickname}</b><span>
        </div>
    `;

    let existingStreakItem = container.find(`[data-streakid='${streakId}']`);


    if (existingStreakItem.length) {
        existingStreakItem.replaceWith(html);
    } else {
        if (!(data.repeatEnd && data.giftType === 1)) {
            container.append(html);
            setTimeout(() => {
                container.find('div')[0].remove();
            }, max);
        }
    }

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 800);
}


// New gift received
connection.on('gift', (data) => {
    if (!isPendingStreak(data) && data.diamondCount > 0) {
        diamondsCount += (data.diamondCount * data.repeatCount);
        updateRoomStats();
    }
    dateNow = Date.now()
    dateNow = dateNow + 0;
    if (dateNow > endBattleDate) {
        endBattleDate = 0;
    }
    if ((data.diamondCount * data.repeatCount) >= window.settings.minDiamonds && endBattleDate == 0) {
        addGiftItem(data);
    }
})

/**
 * Add a MVP at end battle
 */
connection.on('linkMicArmies', (data) => {
    if (data.battleStatus == 2) {
        let container = $('.eventcontainer');
        data.battleArmies.forEach((element, index) => {
            if (element.hostUserId == hostUserId) {
                handleBattleArmy(element, container, max);
            }
        });
    }
})

connection.on('streamEnd', () => {
    $('#stateText').text('Stream ended.');

    // schedule next try if obs username set
    if (window.settings.username) {
        setTimeout(() => {
            connect(window.settings.username);
        }, 30000);
    }
})