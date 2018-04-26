This Volume Renderer employs webGL to develop a dashboard for studying common techniques used in volume rendering on two neighboring graphics side by side. This tool allows users to manipulate lighting, control interpolation schemes, select from multiple datasets, and much more. Shows the dashboard with two volume renderings of the same bonsai tree. Each visualization has seperate controls, but both share an interactable transfer function and Phong lighting control. 

To start this app, first download the code to your local machine using `git clone` or the download button. Then, the easiest way to start this is to navigate to this directory and run

`python -m SimpleHTTPServer`

which will run this program on your local machine at `http://0.0.0.0:8000`. Although depending on your browser, it may suffice to simply run the `Index.html`.