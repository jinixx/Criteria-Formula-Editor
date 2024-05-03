const OperatorList = [
  "+",
  "-",
  "*",
  "/",
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "CONTAINS",
  "AND",
  "OR",
  "NOT",
];
// TODO:
// to determine allowable characters for attributes, values, numerical
const AttributeCharWhiteListRegex = /^[a-zA-Z0-9_]+$/;
const ValueCharWhiteListRegex = /^[ -~]*$/;
const NumericalRegex = /^\d+(?:[.]\d+)?$/;

function QueryBuilder() {
  // Validates that the input string is a valid date formatted as "mm/dd/yyyy"
  // Swap the sequence of parts if needing a diff format
  const isValidDate = (dateString: string) => {
    // First check for the pattern
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) return false;

    // Parse the date parts to integers
    const parts = dateString.split("/");
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if (year < 1000 || year > 3000 || month == 0 || month > 12) return false;

    const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Adjust for leap years
    if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
      monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
  };

  const isCurrValid = (prev, curr) => {
    if (!prev) {
      return (
        curr.type === "ATTR" || (curr.type === "BKT" && curr.value === "(")
      );
    }

    if (!curr) {
      return true;
    }

    console.log("prev:", prev, "curr:", curr);

    switch (prev.type) {
      case "BKT":
        if (prev.value === "(") {
          return (
            curr.type === "ATTR" || (curr.type === "BKT" && curr.value === "(")
          );
        }

        return (
          curr.type === "OPTR" || (curr.type === "BKT" && curr.value === ")")
        );

      case "ATTR":
        return (
          curr.type === "OPTR" || (curr.type === "BKT" && curr.value === ")")
        );

      case "VAL":
        return (
          curr.type === "OPTR" || (curr.type === "BKT" && curr.value === ")")
        );

      case "OPTR":
        return (
          curr.type === "VAL" ||
          (curr.type === "BKT" && curr.value === "(") ||
          curr.type === "ATTR"
        );

      default:
        return false;
    }
  };

  const parseStrToObject = (_str: string) => {
    if (_str === "(" || _str === ")") {
      return [
        {
          str: _str,
          value: _str,
          type: "BKT",
        },
      ];
    }

    if (_str.startsWith("(")) {
      const _arr = [];

      for (let i = 0; i < _str.length; i++) {
        if (_str[i] === "(") {
          _arr.push({
            str: _str[i],
            value: _str[i],
            type: "BKT",
          });
        } else {
          _arr.push(...parseStrToObject(_str.slice(i)));

          break;
        }
      }

      return _arr;
    }

    if (_str.endsWith(")")) {
      const _arr = [];

      for (let i = _str.length - 1; i > 0; i--) {
        if (_str[i] === ")") {
          _arr.unshift({
            str: _str[i],
            value: _str[i],
            type: "BKT",
          });
        } else {
          _arr.unshift(...parseStrToObject(_str.slice(0, i + 1)));

          break;
        }
      }

      return _arr;
    }

    // Check for Attribute
    if (_str.startsWith("{")) {
      if (!_str.endsWith("}")) {
        throw new Error(
          `Invalid attribute format [${_str}], attribute must end with }`,
        );
      }

      const value = _str.slice(1, -1);

      if (!AttributeCharWhiteListRegex.test(value))
        throw new Error(`Invalid characters in Attribute [${value}]`);

      // TODO: check attribute against a list of valid attributes

      return [
        {
          str: _str,
          value,
          type: "ATTR",
        },
      ];
    }

    // Check for Operator
    const operatorIndex = OperatorList.indexOf(_str);

    if (operatorIndex >= 0) {
      return [
        {
          str: _str,
          value: _str,
          type: "OPTR",
        },
      ];
    }

    // Check for boolean values
    if (_str === "TRUE" || _str === "FALSE") {
      return [
        {
          str: _str,
          value: _str === "TRUE",
          type: "VAL",
          valueType: "BOOLEAN",
        },
      ];
    }

    // Check for numerical values including float without quotes
    if (NumericalRegex.test(_str)) {
      return [
        {
          str: _str,
          value: parseFloat(_str),
          type: "VAL",
          valueType: "NUMBER",
        },
      ];
    }

    // Check for string values
    if (_str.startsWith('"')) {
      if (!_str.endsWith('"') || _str.length === 1) {
        throw new Error(
          `Invalid value format [${_str}], 'string' values must end with "`,
        );
      }

      // remove the quotes
      const value = _str.slice(1, -1);

      if (!ValueCharWhiteListRegex.test(value))
        throw new Error(`Invalid characters in Value [${value}]`);

      // Dates are also string
      // Check for date values in mm/dd/yyyy format
      if (isValidDate(value)) {
        return [
          {
            str: _str,
            value: value,
            type: "VAL",
            valueType: "DATE",
          },
        ];
      }

      return [
        {
          str: _str,
          value,
          type: "VAL",
          valueType: "STRING",
        },
      ];
    }

    if (_str) throw new Error(`Invalid object [${_str}]`);
  };

  const parse = (_str: string) => {
    if (typeof _str !== "string")
      throw new Error("Invalid query, must be typeof 'string'");

    const strArr = _str.trim().split(/\s+/);

    if (strArr.length === 1 && strArr[0] === "") return [];

    // console.log("str arr:", strArr);

    const objArr = [];
    let numOfUnclosedBrackets = 0;

    for (let i = 0; i < strArr.length; i++) {
      const _objArr = parseStrToObject(strArr[i]);

      console.log("test:", _objArr);

      if (!Array.isArray(_objArr)) continue;

      for (let k = 0; k < _objArr.length; k++) {
        const obj = _objArr[k];

        if (!obj) continue;

        objArr.push(obj);

        const curr = objArr[i + k];
        const prev = objArr[i + k - 1] || null;
        // const next = objArr[i + k + 1] || null;

        console.log(obj);

        if (obj.type === "BKT") {
          if (obj.value === "(") {
            numOfUnclosedBrackets++;
          } else {
            numOfUnclosedBrackets--;
          }
        }

        if (!isCurrValid(prev, curr)) {
          throw new Error(`Invalid syntax at ${obj.str}`);
        }
      }
    }

    if (numOfUnclosedBrackets > 0) {
      throw new Error(`Missing ${numOfUnclosedBrackets} close bracket(s)`);
    } else if (numOfUnclosedBrackets < 0) {
      throw new Error(
        `Extra ${Math.abs(numOfUnclosedBrackets)} close bracket(s)`,
      );
    }

    // cannot end with operator
    const lastObj = objArr[objArr.length - 1];

    if (lastObj.type === "OPTR") {
      throw new Error(`Invalid syntax at ${lastObj.str}`);
    }

    console.log("object arr:", objArr);

    return objArr;
  };

  return {
    parse,
  };
}

export default QueryBuilder();
