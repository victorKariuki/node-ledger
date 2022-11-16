const mongoose = require('mongoose');

class Mongo {
  #Account;
  #Entry;
  constructor (acCollName, eCollName) {
    const accountSchema = new mongoose.Schema({
      code: String,
      name: String,
      currency: String,
      parent: String,
    }, {
      autoIndex: false,
      timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    });
    const entrySchema = new mongoose.Schema({
      trace: String,
      posted: String,
      date: String,
      desc: String,
      code: String,
      db: Number,
      cr: Number,
      param1: String,
      param2: String,
      param3: String,
    }, {
      autoIndex: false,
      timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    });

    this.#Account = mongoose.model(
      acCollName,
      accountSchema,
    );
    this.#Entry = mongoose.model(
      eCollName,
      entrySchema,
    );
  }

  _connect ({ code, name, currency, parent }) {
    this.#Account.create({ code, name, currency, parent });
  }

  _disconnect ({ code }) {
    this.#Account.deleteOne({ code });
  }

  _get (code) {
    return this.#Account.findOne({ code });
  }

  _findByParent (parent) {
    return this.#Account.find({ parent });
  }

  _post ({ trace, posted, date, desc, entries }) {
    this.#Entry.insertMany(entries.map(
      ({ code, db, cr, param1, param2, param3 }) => {
        return { trace, posted, date, desc, code, db, cr, param1, param2, param3 };
      }
    ));
  }

  _entries ({ code } = {}) {
    return this.#Entry.find({ code });
  }

  async _balance (code) {
    let db = 0;
    let cr = 0;
    let entries = await this.#Entry.aggregate(
      [
        {
          $bucket: {
            groupBy: '$code',
            default: 'Other',
            output: {
              'count': { $sum: 1 },
              cr: {
                sum: { $sum: '$cr' },
                avg: { $avg: '$cr' },
                min: { $min: '$cr' },
                max: { $max: '$cr' },
                mode: { $addToSet: '$cr' },
                std: { $stdDevSamp: '$cr' },
              },
              db: {
                sum: { $sum: '$db' },
                avg: { $avg: '$db' },
                min: { $min: '$db' },
                max: { $max: '$db' },
                mode: { $addToSet: '$db' },
                std: { $stdDevSamp: '$db' },
              },
            },
          },
        },
        { $match: code ? { code } : {} },
      ]
    );
    db = entries[0].db.sum;
    cr = entries[0].cr.sum;
    delete entries[0].db.sum;
    delete entries[0].cr.sum;

    if (db < cr) {
      return { db: 0, cr: cr - db, ...entries[0].db };
    } else {
      return { db: db - cr, cr: 0, ...entries[0].cr };
    }
  }
};

module.exports = Mongo;
