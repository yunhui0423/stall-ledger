// Run from any directory with: node evaluation/check-ledger.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const parse = new Function(html.slice(html.indexOf('const digits'), html.indexOf('function control')) + 'return parseText;')();
const seed = require('./seed-cases.json').cases.map(({input,expected}) => ({
  s: input, expected: expected.map(({type,value}) => [type,value])
}));
const regression = [
  {
    "s": "現金賣了六百零五",
    "expected": [
      [
        "cashIn",
        605
      ]
    ]
  },
  {
    "s": "街口收了九百八",
    "expected": [
      [
        "digitalIn",
        980
      ]
    ]
  },
  {
    "s": "補貨花了七百二",
    "expected": [
      [
        "cashOut",
        720
      ]
    ]
  },
  {
    "s": "刷卡退款一百五",
    "expected": [
      [
        "digitalOut",
        150
      ]
    ]
  },
  {
    "s": "起始現金八百",
    "expected": [
      [
        "float",
        800
      ]
    ]
  },
  {
    "s": "客人還沒付四百二",
    "expected": [
      [
        "unpaid",
        420
      ]
    ]
  },
  {
    "s": "現金賣了四杯各四十五折二十",
    "expected": [
      [
        "cashIn",
        160
      ]
    ]
  },
  {
    "s": "現金賣了五杯每杯三十",
    "expected": [
      [
        "cashIn",
        150
      ]
    ]
  },
  {
    "s": "現金賣了五百折扣五十",
    "expected": [
      [
        "cashIn",
        450
      ]
    ]
  },
  {
    "s": "現金賣了六百打九折",
    "expected": [
      [
        "cashIn",
        540
      ]
    ]
  },
  {
    "s": "現金賣了三杯每杯五十總共一百五",
    "expected": [
      [
        "cashIn",
        150
      ]
    ]
  },
  {
    "s": "現金收了一百找零三十",
    "expected": [
      [
        "cashIn",
        70
      ]
    ]
  },
  {
    "s": "現金收了三百接著進貨花一百接著刷卡收二百",
    "expected": [
      [
        "cashIn",
        300
      ],
      [
        "cashOut",
        100
      ],
      [
        "digitalIn",
        200
      ]
    ]
  },
  {
    "s": "現金收三百又收四百",
    "expected": [
      [
        "cashIn",
        300
      ],
      [
        "cashIn",
        400
      ]
    ]
  },
  {
    "s": "現金賣了兩千，另外LINE Pay收三百",
    "expected": [
      [
        "cashIn",
        2000
      ],
      [
        "digitalIn",
        300
      ]
    ]
  },
  {
    "s": "進貨賒帳五百",
    "expected": [
      [
        "",
        ""
      ]
    ]
  },
  {
    "s": "收到上次賒帳兩百",
    "expected": [
      [
        "cashIn",
        200
      ]
    ]
  },
  {
    "s": "客人假轉帳兩百",
    "expected": [
      [
        "unpaid",
        200
      ]
    ]
  },
  {
    "s": "客人轉帳兩百後取消訂單",
    "expected": [
      [
        "",
        ""
      ]
    ]
  },
  {
    "s": "現金賣了大概六百",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收三百到五百",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金賣了三百多",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收一百二十或一百五十",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收了負五十",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收了二百五，退給客人四十",
    "expected": [
      [
        "cashIn",
        250
      ],
      [
        "cashOut",
        40
      ]
    ]
  },
  {
    "s": "刷卡付運費兩百",
    "expected": [
      [
        "digitalOut",
        200
      ]
    ]
  },
  {
    "s": "補貨花了一千零五",
    "expected": [
      [
        "cashOut",
        1005
      ]
    ]
  },
  {
    "s": "現金收了1,080元",
    "expected": [
      [
        "cashIn",
        1080
      ]
    ]
  },
  {
    "s": "現金收了八十，找零金三百",
    "expected": [
      [
        "cashIn",
        80
      ],
      [
        "float",
        300
      ]
    ]
  },
  {
    "s": "補貨沒花錢五百",
    "expected": [
      [
        "cashOut",
        ""
      ]
    ]
  },
  {
    "s": "現金收了一千找零八百",
    "expected": [
      [
        "cashIn",
        200
      ]
    ]
  },
  {
    "s": "現金賣了三杯每杯五十總共一百四",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "轉帳收到上次賒帳兩百",
    "expected": [
      [
        "digitalIn",
        200
      ]
    ]
  },
  {
    "s": "補貨八百還沒付",
    "expected": [
      [
        "",
        ""
      ]
    ]
  },
  {
    "s": "現金收了一千多元",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收了五百五十左右",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金賣了八百打七折",
    "expected": [
      [
        "cashIn",
        560
      ]
    ]
  },
  {
    "s": "刷卡收入八百打五折再退款二十",
    "expected": [
      [
        "digitalIn",
        400
      ],
      [
        "cashOut",
        20
      ]
    ]
  },
  {
    "s": "現金收了五十找零八十",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金賣了兩盒各一百二折二十",
    "expected": [
      [
        "cashIn",
        220
      ]
    ]
  }
];
const english = [
  {
    "s": "Starting cash five hundred, cash sales 2,300, LINE Pay received eight hundred, spent 450 on supplies in cash.",
    "expected": [
      [
        "float",
        500
      ],
      [
        "cashIn",
        2300
      ],
      [
        "digitalIn",
        800
      ],
      [
        "cashOut",
        450
      ]
    ]
  },
  {
    "s": "Cash sales one thousand two hundred and thirty-five",
    "expected": [
      [
        "cashIn",
        1235
      ]
    ]
  },
  {
    "s": "Sold 250 in cash then paid 120 by card",
    "expected": [
      [
        "cashIn",
        250
      ],
      [
        "digitalOut",
        120
      ]
    ]
  },
  {
    "s": "LINE Pay refunded seventy-five",
    "expected": [
      [
        "digitalOut",
        75
      ]
    ]
  },
  {
    "s": "Sold two hundred on credit",
    "expected": [
      [
        "unpaid",
        200
      ]
    ]
  },
  {
    "s": "Cash sales around three hundred",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "Received USD 50 in cash",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "Sold 500 in cash, 補貨花一百",
    "expected": [
      [
        "cashIn",
        500
      ],
      [
        "cashOut",
        100
      ]
    ]
  },
  {
    "s": "Cash sales 300. Spent 40 in cash.",
    "expected": [
      [
        "cashIn",
        300
      ],
      [
        "cashOut",
        40
      ]
    ]
  },
  {
    "s": "Cash sales 100.50",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "Cash sales negative one hundred",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "Bought stock on credit for 350",
    "expected": [
      [
        "",
        ""
      ]
    ]
  },
  {
    "s": "Customer hasn't paid 200",
    "expected": [
      [
        "unpaid",
        200
      ]
    ]
  },
  {
    "s": "Starting cash 500 and then received 240 by card",
    "expected": [
      [
        "float",
        500
      ],
      [
        "digitalIn",
        240
      ]
    ]
  }
];
const mixed = [
  {
    "s": "今仔日 starting cash 五百箍",
    "expected": [
      [
        "float",
        500
      ]
    ]
  },
  {
    "s": "現金 sold 三百箍",
    "expected": [
      [
        "cashIn",
        300
      ]
    ]
  },
  {
    "s": "LINE Pay 收著 eighty",
    "expected": [
      [
        "digitalIn",
        80
      ]
    ]
  },
  {
    "s": "補貨 paid by card 100箍",
    "expected": [
      [
        "digitalOut",
        100
      ]
    ]
  },
  {
    "s": "客人猶未予錢 two hundred",
    "expected": [
      [
        "unpaid",
        200
      ]
    ]
  },
  {
    "s": "今仔日現金收了 around three hundred",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "刷卡 refund 八十箍，再補貨花一百",
    "expected": [
      [
        "digitalOut",
        80
      ],
      [
        "cashOut",
        100
      ]
    ]
  },
  {
    "s": "今仔日現金收入三百外箍",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收入 USD 50 箍",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "現金收入 negative fifty 箍",
    "expected": [
      [
        "cashIn",
        ""
      ]
    ]
  },
  {
    "s": "今仔日 starting cash 五百箍，現金 sold 三百箍，LINE Pay 收著 eighty，客人猶未予錢 two hundred",
    "expected": [
      [
        "float",
        500
      ],
      [
        "cashIn",
        300
      ],
      [
        "digitalIn",
        80
      ],
      [
        "unpaid",
        200
      ]
    ]
  }
];
const cases = [...seed, ...regression, ...english, ...mixed];
let failures = 0;
for (const {s, expected} of cases) {
  try {
    assert.deepEqual(parse(s).map(({type,value}) => [type,value]), expected);
  } catch (error) {
    failures++;
    console.error(s, error.message);
  }
}
console.log((cases.length - failures) + '/' + cases.length + ' passed');
process.exitCode = failures ? 1 : 0;
