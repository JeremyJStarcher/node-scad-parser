number = 12.3;
string = "Hallo?";
vector=["abc", 34];
include <tools.scad>;
use <junctions.scad>;
include <../helper.scad>;
cube([1,2.3,0],"c",d=3);

// Test comment

function add(a,b) = (a+2);


function pi() = 3.1415;

module test(d=3) {
    test();
}

fz=[1,true,3];
fz=1+(2*4);
fz=[7,8+9,10];
fz=[(4-(pinHeaderHeight/2)),((pcbHeight/2)-(pinHeaderWidh/2)),-pinHeaderBottomDepth];
xx=[1:2:3];
yy=[1:2];

color("red");

xxxx=-(4+2);
i= 5 == 3;

color("black") translate() {
    XXX=10;
    #cube([1,2.3,0],"c",d=3);
}



CubePoints = [
    [  -(size/2),  -(size/2),  0 ],  //0
    [ vfdWidth+(shrink*4)+(size/2),  -(size/2),  0 ],  //1
    [ vfdWidth+(shrink*4)+(size/2),  vfdHeight+(shrink*4)+(size/2),  0 ],  //2
    [  -(size/2),  vfdHeight+(shrink*4)+(size/2),  0 ],  //3
    [  shrink-(size/2),  shrink-(size/2),  topFrameDepth ],  //4
    [ vfdWidth+(shrink*3)+(size/2),  shrink-(size/2),  topFrameDepth ],  //5
    [ vfdWidth+(shrink*3)+(size/2),  vfdHeight+(shrink*3)+(size/2),  topFrameDepth ],  //6
    [  shrink-(size/2),  vfdHeight+(shrink*3)+(size/2),  topFrameDepth ]
]; //7
