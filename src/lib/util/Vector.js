const EPSILOW = 1e-8;

/**
 *  ||u|| 表示向量u的求模，或者向量的大小
 *  vector + vector 向量的加法，两个向量的所有分量相加，返回一个新的向量 [1,2]+[3,4] = [4,6]
 *  vector - vector 向量的减法，两个向量的所有分量相减，返回一个新的向量 [1,2]+[3,4] = [-2,-2]
 *  vector * k 向量乘以标量，向量的每个一个分量乘以标量，返回一个新的向量 [1,2] * 3 = [3,6]
 *  vector * vector 向量乘以向量，又称为点乘，返回一个标量k，[1,2]  * [3,4] =1*3 +2 * 4 = 11
 *      ----------------------------------------------------
 *      - 推荐系统
 *      - k > 0 表示两个向量相似
 *      - k < 0 表示两个向量相反
 *      - k ==0 表示两个向量垂直 。常用语相似度判断在推荐系统中常用
 *      ----------------------------------------------------
 *      - 几何计算
 *      - 计算夹角  cosθ = (v1 * v2 ) /||v1|| * ||v2||  :number
 *      - 计算投影长度 d = (v1 * v2 ) / ||v2|| = cosθ* ||v1||  : number
 *      - 计算投影点坐标 P = d * v2.nonamlize()   :Vector
 *  norm : 求模  所有维度的开平方根 √v[0]^2 +v[1]^2 +...v[n]^2 :number
 *  normalize: 单位向量 v * 1/norm :Vector
 */
class Vector {
  static zero(dim) {
    return new Vector(new Array(dim).fill(0));
  }

  constructor(lst) {
    this._values = lst;
  }

  valueOf() {
    return JSON.parse(JSON.stringify(this._values));
  }

  /**
   * 所有维度（分量）的开平方根
   * 求模，向量大小 ||a^2+b^2+c^2+...n^2||
   * @return {number}
   */
  norm() {
    return Math.sqrt(this._values.map((item) => Math.pow(item, 2)).reduce((a, b) => a + b));
  }

  /**
   *求单位向量, 向量 *  大小的倒数
   * @return {Vector}
   */
  normalize() {
    let n = this.norm();
    if (n < EPSILOW) throw Error(`[ Normalize Error] ${this.toString()} can not be normalize.`);
    return this.div(n);
  }

  toString() {
    return `Vector(${this._values.join(', ')})`;
  }

  get length() {
    return this._values.length;
  }

  // 向量加法
  /**
   * 与一个新的向量的每一个分量相加
   * @param vector
   * @return {Vector}
   */
  add(vector) {
    return new Vector(vector._values.map((item, index) => item + this._values[index]));
  }

  /**
   * 减去向量中每个分量
   * @param vector
   * @return {Vector}
   */
  sub(vector) {
    return new Vector(vector._values.map((item, index) => item - this._values[index]));
  }

  /**
   * 向量乘以一个标量，向量里面的每个分量 乘以标量
   * @param number
   * @return {Vector}
   */
  mul(number) {
    return new Vector(this._values.map((item) => item * number));
  }

  /**
   * 1.点乘在推荐系统中常用，判断相似度 。
   *  - =0 , 表示为两个向量为垂直关系 ,没有关系
   *  - >0 , 夹角为锐角, 越大越相似
   *  - <0 , 夹角为钝角，相悖
   * 2.几何计算
   *  - 夹角 dot() / ||vector||
   *  - 投影向量的距离 (dot() / ||vector||) :number
   *  - 投影点坐标 (dot() / ||vector||) * normalize() :Vector
   *
   * @param vector
   * @return {number}
   */
  dot(vector) {
    if (vector instanceof Vector && this.length === vector.length) {
      return this._values.map((item, index) => item * vector._values[index]).reduce((a, b) => a + b);
    }
    throw Error('The param `vector` must instance of Vector');
  }

  // 向量数量除法
  div(number) {
    return this.mul(1 / number);
  }

  // 取正
  pos() {
    return this.mul(1);
  }

  // 取负
  neg() {
    return this.mul(-1);
  }

  get(index) {
    return this._values[index];
  }
}

export default Vector;
