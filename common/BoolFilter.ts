
export default class BoolFilter {    
    private boolString = '';    
    private boolTemplate = '';
    private boolOperands: string[] = [];  
    
    constructor(filter: string) {
        this.boolString = filter;        
        this.buildBoolTemplate();
    }
   
    public isInvalidFilterSyntax(): boolean {        
        if (this.boolTemplate.length > 0) {
            let boolString = this.boolTemplate;
            for (let i = 0; i < this.boolOperands.length; ++i) {
                boolString = boolString.replace('###'+i, 'true');
            }
            //console.log(boolString);
            try {
                // eslint-disable-next-line no-eval
                eval(boolString);
                return false;
            } catch (e) {                
                return true;
            }
        }
        return false;
    }

    private buildBoolTemplate() {
        this.boolTemplate = '';
        this.boolOperands.splice(0, this.boolOperands.length);
        let argNum = 0;
        if (this.boolString.includes('!')
            || this.boolString.includes('&&')
            || this.boolString.includes('||')) {
            let operand = '';
            for (let i = 0; i < this.boolString.length; ++i) {
                let c1 = this.boolString.substr(i, 1);
                let c2 = i < this.boolString.length - 1 ? this.boolString.substr(i + 1, 1) : '';
                let nonOperand = '';
                if (c1 === '!' || c1 === '(' || c1 === ')') nonOperand = c1;
                if (c1 === '&' && c2 === '&') {
                    ++i;
                    nonOperand = '&&';
                }
                if (c1 === '|' && c2 === '|') {
                    ++i;
                    nonOperand = '||';
                }
                if (nonOperand.length > 0) {
                    operand = operand.trim();
                    if (operand.length > 0) {
                        this.boolTemplate += '###' + argNum++;
                        this.boolOperands.push(operand);
                        operand = '';
                    }
                    this.boolTemplate += nonOperand;
                }
                else {
                    operand += c1;
                }
            }

            if (operand.length > 0) {
                this.boolTemplate += '###' + argNum++;
                this.boolOperands.push(operand.trim());
            }
        }
    }

    public getFilter() {
        return this.boolString;
    }

    public isFiltered(data: string) { 
        if (this.boolString.length === 0) return false;
        if (this.boolTemplate.length > 0) {
            let boolString = this.boolTemplate;
            for (let i = 0; i < this.boolOperands.length; ++i) {
                const filtered = data.indexOf(this.boolOperands[i]) === -1;
                boolString = boolString.replace('###'+i, (filtered ? 'false' : 'true'));
            }
            //console.log(boolString);
            try {
                // eslint-disable-next-line no-eval
                return !eval(boolString);
            } catch (e) {
                return true;
            }
        }
        else {
            return data.indexOf(this.boolString) === -1;
        }
    }
}