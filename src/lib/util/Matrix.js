import Vector from './Vector';

/**
 *
 */
class Matrix {
  constructor(list2d) {
    this._values = list2d;
  }

  /**
   *  0矩阵
   * @param shape
   * @return {Matrix}
   */
  static zeros(shape) {
    return new Matrix(new Array(shape[0]).fill(null).map((item) => new Array(shape[1]).fill(0)));
  }

  /**
   * 单位矩阵,方阵，I*A=A  A*I=A,相当于数字系统中1的作用
   * @param n n*n
   * 返回一个 n* n 的矩阵
   */
  static identity(n) {
    return new Matrix(
      new Array(n).fill(null).map((_, rowIndex) => {
        return new Array(n).fill(0).map((_, colIndex) => {
          return rowIndex === colIndex ? 1 : 0;
        });
      })
    );
  }

  valueOf() {
    return JSON.parse(JSON.stringify(this._values));
  }

  toString() {
    return 'Matrix ( ' + this._values.map((item) => item.join(' ')).join(', ') + ' )';
  }

  rows() {
    return this._values.length;
  }

  cols() {
    return this._values[0].length;
  }

  shape() {
    return [this.rows(), this.cols()];
  }

  size() {
    return this.rows() * this.cols();
  }

  get(pos) {
    return this._values[pos[0]][pos[1]];
  }

  rowVector(row) {
    return new Vector(this._values[row].slice(0));
  }

  colVector(col) {
    let v = new Array(this.rows()).fill(0);
    this._values.forEach((item, index) => {
      v[index] = item[col];
    });
    return new Vector(v);
  }

  _calc(matrix, id) {
    return new Matrix(
      this._values.map((item, row) => {
        return item.map((item, col) => item + matrix._values[row][col] * id);
      })
    );
  }

  add(matrix) {
    return this._calc(matrix, 1);
  }

  sub(matrix) {
    return this._calc(matrix, -1);
  }

  mul(number) {
    return new Matrix(
      this._values.map((item, row) => {
        return item.map((item, col) => item * number);
      })
    );
  }

  /**
   * 矩阵乘法，和 向量 相乘返回一个新的向量，和矩阵相乘返回一个新的举证
   * @param v
   */
  dot(v) {
    if (v instanceof Vector && this.cols() === v.length) {
      return new Vector(
        new Array(v.length).fill(null).map((item, index) => {
          return this.rowVector(index).dot(v);
        })
      );
    }
    if (v instanceof Matrix && this.cols() === v.rows()) {
      let cols = v.cols(),
        rows = v.rows();
      let newMatrix = Matrix.zeros([rows, cols]);
      let v1;
      for (let i = 0; i < cols; i++) {
        v1 = this.dot(v.colVector(i));
        for (let j = 0; j < rows; j++) {
          newMatrix._values[j][i] = v1.get(j);
        }
      }
      return newMatrix;
    }
    throw Error('expected a Vector or Matrix but got ' + typeof v);
  }

  get(row, col) {
    return this._values[row][col];
  }

  set(row, col, value) {
    this._values[row][col] = value;
  }

  div(number) {
    return this.mul(1 / number);
  }

  T() {
    return new Matrix(
      new Array(this.cols()).fill(null).map((_, colIndex) => {
        return new Array(this.rows()).fill(0).map((_, rowIndex) => {
          return this.get(rowIndex, colIndex);
        });
      })
    );
  }

  isSquare() {
    return this.cols() === this.rows();
  }
}
export default Matrix;
