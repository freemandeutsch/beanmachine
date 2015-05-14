/*  ---------------------------------------------------

    Visualization of bean machine, also known as the quincunx or Galton box. 
    
    BeanMachine version 1.0, Copyright (C) 2014 Freeman Deutsch 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

 --------------------------------------------------- */

'use strict';


// ---------------------------------------------------

var RADIUS = 10;
var MARGIN_SPACE = 70;
var NUM_PINS_HORIZONTAL = 5;
var KEY_FRAME_ANIMATION_STEPS = 5;

// ---------------------------------------------------


function SettingsClass() {

   this.calculatFrameDelay = function() {
        return 1000 * (1 / (this.speed * 10));
    }
    
    this.isRunning = true;
    this.speed = 5;
    this.frameDelay = this.calculatFrameDelay();
    // values range from  1 and 10, HTML selector shows .1 to 1
    this.leftProbability = 5;   
}


// Global shared allocated class for simulation settings
var settings = new SettingsClass();



// x and y are pixel positions on the screen
// These are the Pins the Beans Collide with
function PinClass(x, y, radius, color, show) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.show = show;
}

// ---------------------------------------------------
/*
x and y have the following coordinate system

1,N     2,N     3,N
1,N-1   2,N-1   3,N-1
*/

// Store bean positional information as well as being able to find pin that the
// bean is hitting.

function BeanClass(width, height) {

    this.width = width; // in pins
    this.height = height; // in pins

    this.x = 0;
    this.y = 0;

    this.init = function() {
        this.x = Math.ceil(this.width / 2);
        this.y = this.height;
    };

    // get the array index of the pin
    this.getIndex = function() {

        var x = this.x - 1;
        var y = (this.y * -1) + this.height;

        return ((this.width * y) + x);
    };
}

// ---------------------------------------------------

// Get the path of the bean going from row to row

function BeanPathClass(width, height) {

    this.width = width;
    this.height = height;
    this.beanPathArray = [];
    this.bean = new BeanClass(this.width, this.height);

    // ---------------------------------------------------

    this.init = function() {
        this.bean.init();
        this.beanPathArray.push(this.bean);
    };

    // ---------------------------------------------------

    // rows are zero based here
    this.getBeanForThisRow = function(row) {

        // if we already calculated it, grab it from array
        if ((row + 1) <= this.beanPathArray.length) {
            return this.beanPathArray[row];
        } else {

            // create new storage to put on array
            var temp = new BeanClass(this.width, this.height);

            // Let this new BeanClass, know where it has been
            temp.x = this.bean.x;
            temp.y = this.bean.y;

            this.bean = temp;

            // calculate position on next row
            this.calculatePositionOnNextRow(this.bean);

            // store so we can retrieve old rows later
            this.beanPathArray.push(this.bean);

            return this.bean;
        }
    };

    // ---------------------------------------------------

    // Determine the beans path when it hits a pin,
    // use pseudo random numbers to determin if
    // the bean will go left or right

    this.calculatePositionOnNextRow = function(bean) {

        // Return a random number between 1 and 10
        var randomNumber = Math.floor((Math.random() * 10) + 1);

        // hit left side
        if (bean.x == (Math.ceil(this.width / 2) - bean.y - 1)) {
            bean.x += 1;
        } // hit right site
        else if (bean.x == (Math.ceil(this.width / 2) + bean.y)) {
            bean.x -= 1;
        } else {
            if (randomNumber > settings.leftProbability) { // bean goes right
                // if row NOT flush left
                if (((bean.y - 1) % 2) != 0) {
                    bean.x += 1;
                }
            } else { // bean goes left
                // if row flush left
                if (((bean.y - 1) % 2) == 0) {
                    bean.x -= 1;
                }
            }
        }

        // jump down to next row
        if (bean.y >= 1) {
            bean.y -= 1;
        }

    };

}

// ---------------------------------------------------

// Controls the BeanMachine

function BeanMachineClass() {

    this.settings = settings;
    this.standardDeviation = 0.0;
    this.width = NUM_PINS_HORIZONTAL; // in pins
    this.height = NUM_PINS_HORIZONTAL; // in pins
    this.xPositionOfMiddleBean = Math.floor(this.width / 2);
    this.barGraphDataArray = [];
    this.pinData = [];
    this.animationIndex = 0;
    this.animationSubIndex = 0;
    this.beanPathClass;

    // ---------------------------------------------------


    // Make a triangle out multi rows of pins

    /*

    Turn this grid of pins/circles

    1   2   3   4   5
      1   2   3   4   5
    1   2   3   4   5
      1   2   3   4   5
    1   2   3   4   5


    into this triangle

            3
          2   3
        2   3   4
      1   2   3   4
    1   2   3   4   5


    */


    this.init = function() {

        for (var i = 0; i < this.width; i++) {
            this.barGraphDataArray.push(0);
        }


        // initialize

        var rowOffset;
        for (var j = 0; j < this.height; j++) {

            // Every other row of pins is shifted
            if ((j % 2) == 0) {
                rowOffset = 0;
            } else {
                rowOffset = MARGIN_SPACE / 2;
            }


            var xValuesToShow = this.getValuesToShow(j);


            for (var i = 0; i < this.width; i++) {
                var show = false; // show or hide pin

                // the last row we do not show pins,
                // this is where we collect beans
                if (j != this.height - 1) {
                    for (var z in xValuesToShow) {
                        if (xValuesToShow[z] == i) {
                            show = true;
                        }
                    }
                }

                this.pinData.push(new PinClass(MARGIN_SPACE * i +
                    MARGIN_SPACE + rowOffset, 15 + MARGIN_SPACE *
                    j + MARGIN_SPACE,
                    RADIUS, 'red', show));
            }

        }


    };

    // ---------------------------------------------------

    // zero out the data in the bar graph so we can start the experiment again


    this.reset = function() {

        this.barGraphDataArray = [];

        for (var i = 0; i < this.width; i++) {
            this.barGraphDataArray.push(0);
        }
    };

    // ---------------------------------------------------

    /*
     Row 1      2       middle
     Row 2      12      middle - 1 left
     Row 3      123     middle + 1 right
     Row 4      0123    middle - 2 left
     Row 5      01234   middle + 2 right
     */

    // We show the values that will make a triangle
    // out of the grid of Pins/Circles
    // Every other row of Pins/Circles is inset to the right

    this.getValuesToShow = function(row) {

        var xValuesToShow = [];
        for (var j = 0; j <= row; j++) {
            var result;
            if (j == 0) {
                result = this.xPositionOfMiddleBean;
            } else {

                var offset = Math.ceil(j / 2.0);

                if ((j % 2) == 0) {
                    result = this.xPositionOfMiddleBean + offset;
                } else {
                    result = this.xPositionOfMiddleBean - offset;
                }
            }
            xValuesToShow.push(result);
        }
        return xValuesToShow;
    };


    // -------------------------------------------------------------------------


    // Draw Distribution

    this.drawDistribution = function(ctx) {


        // get X distance between first two circles on last row
       //  last row is where area for distribution really starts

        var index = this.width * (this.height - 2);
        var circle1 = this.pinData[index];
        var circle2 = this.pinData[index + 1];

        // add vertical space of MARGIN_SPACE from last pin
        var top = circle1.y + circle1.radius + MARGIN_SPACE;

        var left = 0;

        var height = 140; //  the real max hight of the bar graph in pixels

        var row_offset = MARGIN_SPACE / 2;

        var width = MARGIN_SPACE * (this.width + 1) + row_offset;

        // get Max value, which should always really be middle value


        var maxValue = -1;
        var maxBarGraphIndex = 0;
        for (var k in this.barGraphDataArray) {
            var num = this.barGraphDataArray[k];

            if (num > maxValue) {
                maxValue = num;
                maxBarGraphIndex = k;
            }
        }



        var barWidth = circle2.x - circle1.x - 40;


        // plot bar graph

        var xPositionOfGaussianCenter = 0;

        // we are really looking at first row here
        for (var k in this.barGraphDataArray) {


            num = this.barGraphDataArray[k];
            num /= maxValue; // normalize value here

            var circle = this.pinData[k];

            var value = height * num;

            var pixelValue = height - value;

            ctx.beginPath();
            ctx.rect(circle.x - row_offset + (circle.radius * 2), top +
                pixelValue, barWidth, height - pixelValue);
            ctx.fillStyle = 'red';
            ctx.strokeStyle = 'red';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.closePath();
            ctx.stroke();


            if (this.settings.leftProbability == 5) {

                if (k == this.xPositionOfMiddleBean) {

                    xPositionOfGaussianCenter = circle.x - row_offset +
                        (circle.radius * 2) + (barWidth / 2.0);
                }
            } else if (k == maxBarGraphIndex) {

                xPositionOfGaussianCenter = circle.x - row_offset + (
                    circle.radius * 2) + (barWidth / 2.0);
            }
        }


     
        var mean = this.barGraphDataArray[maxBarGraphIndex];
       

        
        /*
            http://en.wikipedia.org/wiki/Standard_deviation
            For a finite set of numbers, the standard deviation is
            found by taking the square root of the average
            of the squared differences of the values from their average value.
        */

        var sumSquaredDiff = 0;
        for (var i in this.barGraphDataArray) {
            var value = this.barGraphDataArray[i];
            sumSquaredDiff = (value - mean) * (value - mean);
        }


        var scale = height / mean;

        this.standardDeviation = Math.sqrt(sumSquaredDiff / mean) * scale;

    

        // plot gaussian reference graph

        ctx.beginPath();

        for (var x = left; x < (left + width - 40); x++) {

            var y = this.gaussian(x, height,
            this.standardDeviation, xPositionOfGaussianCenter);

            if (x == left) {
                ctx.moveTo(left, top + height - y);
                ctx.lineTo(x, top + height - y);
            } else {
                ctx.lineTo(x, top + height - y);
            }

        }

        // Draw gaussian in blue with pen size 3
        ctx.strokeStyle = 'rgb(0,0,255)';
        ctx.lineWidth = 3;
        ctx.stroke();


        // make path going into bins

        var circle;
        for (var k in this.barGraphDataArray) {
            if (k != 0) {
                circle = this.pinData[k];
                ctx.beginPath();
                ctx.moveTo(circle.x - row_offset, top - 30);
                ctx.lineTo(circle.x - row_offset, top + height);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.closePath();
                ctx.stroke();
            }
        }


        // show value of each value in bar numerically,
        // .i.e. how many beans in each column


        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.fill();

        var slot = 1;
        for (var k in this.barGraphDataArray) {

            var circle = this.pinData[k];

            var count = this.barGraphDataArray[k];
            ctx.fillText(count, circle.x - row_offset + (circle.radius *
                2), top + height + 20);

            slot += 1;
        }


        ctx.stroke();


       



    };


    // ---------------------------------------------------


    // http://en.wikipedia.org/wiki/Gaussian_function
    // http://en.wikipedia.org/wiki/Standard_deviation

    this.gaussian = function(x, amplitude, standardDeviation,
        xPositionOfGaussianCenter) {

        var a = amplitude; //  amplitude
        var b = xPositionOfGaussianCenter;
        var c = standardDeviation * 7; // width
        var d = 0; // height offset from bottom

        return a * Math.exp(-((x - b) * (x - b)) / (2 * c * c)) + d;
    };


    // ---------------------------------------------------


    this.drawBackgound = function(ctx) {


        // ------- draw funnel that shoots out beans -----

        var midBean = this.pinData[this.xPositionOfMiddleBean];

        ctx.beginPath();
        ctx.moveTo(midBean.x - 50, 0);
        ctx.lineTo(midBean.x + 50, 0);
        ctx.lineTo(midBean.x + 30, 30);
        ctx.lineTo(midBean.x - 30, 30);
        ctx.lineTo(midBean.x - 50, 0);
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.closePath();
        ctx.stroke();




        //  -------  draw the pins  -------
        ctx.font = '30px Arial';
        for (var i in this.pinData) {

            var circle = this.pinData[i];

            if (circle.show) {
                ctx.beginPath();
                ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI,
                    false);
                ctx.strokeStyle = 'black';
                ctx.fillStyle = '#99FF66'; // lite green

                ctx.fill();

                // show pin value for debugging
                //ctx.fillText(i ,circle.x + circle.radius, circle.y);

                ctx.lineWidth = 1;
                ctx.closePath();
                ctx.stroke();
            }
        }



    };

    // ---------------------------------------------------

    // Implements Key Frame animation between the bean going from pin to pin

    this.drawAnimatedBean = function(ctx) {

        // Animate bean coming from funnel to first bean
        if (this.animationIndex == -1) {

            var circleCurrent = this.pinData[this.xPositionOfMiddleBean];

            var deltaX = 0;
            var deltaY = (circleCurrent.y - 30) /
                KEY_FRAME_ANIMATION_STEPS;

            ctx.beginPath();
            ctx.arc(circleCurrent.x + (deltaX * this.animationSubIndex),
                30 + RADIUS + (deltaY * this.animationSubIndex),
                RADIUS, 0, 2 * Math.PI, false);
            ctx.strokeStyle = 'black';
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.closePath();
            ctx.stroke();

            this.animationSubIndex++;

            if (this.animationSubIndex == KEY_FRAME_ANIMATION_STEPS) {
                this.animationSubIndex = 0;
                this.animationIndex = 1;
            }

        } else { // Animate beans going from pin to bin


            var beanLast =
                this.beanPathClass.getBeanForThisRow(this.animationIndex -
                    1);
            var beanCurrent =
                this.beanPathClass.getBeanForThisRow(this.animationIndex);


            var beanLastIndex = beanLast.getIndex();
            // console.log('beanLastIndex ' + beanLastIndex);


            var beanCurrentIndex = beanCurrent.getIndex();
            // console.log('beanCurrentIndex ' + beanCurrentIndex);

            var circleLast = this.pinData[beanLastIndex];
            
            var circleCurrent = this.pinData[beanCurrentIndex];


            var deltaX = (circleCurrent.x - circleLast.x) /
                KEY_FRAME_ANIMATION_STEPS;
            var deltaY = (circleCurrent.y - circleLast.y) /
                KEY_FRAME_ANIMATION_STEPS;

            ctx.beginPath();
            ctx.arc(circleLast.x + (deltaX * this.animationSubIndex),
                circleLast.y + (deltaY * this.animationSubIndex),
                circleLast.radius, 0, 2 * Math.PI, false);
            ctx.strokeStyle = 'black';
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.closePath();
            ctx.stroke();

            this.animationSubIndex++;

            if (this.animationSubIndex == KEY_FRAME_ANIMATION_STEPS) {
                this.animationSubIndex = 0;
                this.animationIndex++;

                if (beanCurrent.y == 1) {

                    // add outcome to distribution

                    this.barGraphDataArray[beanCurrent.x - 1] += 1;
                }
            }

            // we just got a bean in the bin
            if (this.animationIndex == this.height) {
                // next we will grab a new bean when
                // this.animationIndex is set to 0
                this.animationIndex = 0;
            }

        }

    };
}
