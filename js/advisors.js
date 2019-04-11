// randomly sample the order of advisors
var advisors = document.getElementById("advisors");
var a0 = document.createElement("a");
a0.href = "https://www.cc.gatech.edu/~hays/";
a0.target = "_blank";
a0.innerText = "James Hays";
var a1 = document.createElement("a");
a1.href = "http://charliekemp.com/";
a1.target = "_blank";
a1.innerText = "Charlie Kemp";
if (Math.random() > 0.5) {
    advisors.appendChild(a0);
    advisors.innerHTML += ", ";
    advisors.appendChild(a1);
} else {
    advisors.appendChild(a1);
    advisors.innerHTML += ", ";
    advisors.appendChild(a0);
}
